import { SketchfabAPI, SketchfabMaterial } from '../types';

// The specific Model UID for a generic T-Shirt.
// Model: "T-Shirt Low Poly" by "JC4862"
const MODEL_UID = '3e4b13a502884acfbd79cee0f9cd8876';

export class SketchfabService {
  private api: SketchfabAPI | null = null;
  private iframeId: string;
  private tShirtMaterialName: string | null = null;

  constructor(iframeId: string) {
    this.iframeId = iframeId;
  }

  public initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const iframe = document.getElementById(this.iframeId) as HTMLIFrameElement;
      if (!iframe) {
        reject(new Error('Sketchfab iframe missing'));
        return;
      }

      // Poll for the Sketchfab API object in case script loads slowly
      let attempts = 0;
      const checkAPI = () => {
        if (window.Sketchfab) {
          this.initClient(iframe, resolve, reject);
        } else {
          attempts++;
          if (attempts > 20) { // 2 seconds timeout
             reject(new Error('Sketchfab API script failed to load'));
          } else {
             setTimeout(checkAPI, 100);
          }
        }
      };
      
      checkAPI();
    });
  }

  private initClient(iframe: HTMLIFrameElement, resolve: any, reject: any) {
      try {
        const client = new window.Sketchfab('1.12.1', iframe);

        client.init(MODEL_UID, {
          success: (api: SketchfabAPI) => {
            this.api = api;
            api.start();
            api.addEventListener('viewerready', () => {
              console.log('Viewer is ready');
              this.findTShirtMaterial()
                .then(() => resolve())
                .catch((e) => {
                    console.warn('Could not auto-detect material, defaulting', e);
                    // Resolve anyway so the app is usable
                    resolve();
                });
            });
          },
          error: (err: any) => {
            console.error('Sketchfab init error:', err);
            reject(err);
          },
          ui_stop: 0,
          ui_watermark: 0,
          ui_controls: 1,
          ui_infos: 0,
          // Transparent background option if needed, usually 0 for solid
          transparent: 0 
        });
      } catch (e) {
        reject(e);
      }
  }

  private findTShirtMaterial(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.api) return reject('API not ready');

      this.api.getMaterialList((err, materials) => {
        if (err) return reject(err);
        
        console.log('Available Materials:', materials.map(m => m.name));

        // Logic to find the main fabric material. 
        // Expanded keywords to catch various naming conventions
        const keywords = ['t_shirt', 'shirt', 'fabric', 'body', 'lambert', 'material', 'default'];
        
        const found = materials.find(m => {
            const lowerName = m.name.toLowerCase();
            return keywords.some(k => lowerName.includes(k));
        });
        
        // Fallback to the first material if no specific name matches
        const target = found || materials[0];

        if (target) {
          this.tShirtMaterialName = target.name;
          console.log(`Found Target Material: ${target.name}`);
          resolve();
        } else {
          console.warn("No suitable material found in list:", materials);
          reject('No suitable material found');
        }
      });
    });
  }

  public updateTexture(base64Image: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.api) {
         console.warn('API not ready yet.');
         return resolve(); 
      }
      
      // If we haven't found a material yet, try finding it again
      if (!this.tShirtMaterialName) {
          this.findTShirtMaterial().then(() => {
              this.performTextureUpdate(base64Image, resolve, reject);
          }).catch(err => {
              console.error("Cannot update texture: " + err);
              resolve(); 
          });
      } else {
          this.performTextureUpdate(base64Image, resolve, reject);
      }
    });
  }

  private performTextureUpdate(base64Image: string, resolve: () => void, reject: (err: any) => void) {
      if (!this.api || !this.tShirtMaterialName) return;

      // 1. Upload the texture to Sketchfab session
      this.api.addTexture(base64Image, (err, textureUid) => {
        if (err) return reject(err);

        // 2. Get the material again to ensure we have fresh reference
        this.api?.getMaterialList((err, materials) => {
          if (err) return reject(err);
          
          const material = materials.find(m => m.name === this.tShirtMaterialName);
          if (!material) return reject('Material not found during update');

          // 3. Assign the new texture to the Albedo/Diffuse channel
          // We reset color to white so the texture shows its true colors
          // We apply to multiple possible channel names to be safe
          let applied = false;
          
          const applyToChannel = (channelName: string) => {
             if (material.channels[channelName]) {
                 material.channels[channelName].texture = { uid: textureUid };
                 material.channels[channelName].color = [1, 1, 1];
                 applied = true;
             }
          };

          applyToChannel('AlbedoPBR');
          applyToChannel('DiffusePBR');
          applyToChannel('DiffuseColor');

          if (!applied) {
              console.warn("Could not find standard color channel to apply texture");
          }

          // 4. Apply changes
          this.api?.setMaterial(material, (err, result) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
  }

  public setCameraView(view: 'front' | 'back' | 'left' | 'right'): void {
    if (!this.api) return;

    // Approximate coordinates for a standard T-shirt model
    // Center is usually roughly (0,0,0) or slightly offset height-wise
    // Eye position determines the angle
    // Note: Axes might need adjustment depending on the specific model's export settings (Y-up vs Z-up)
    // Assuming generic Z-up for web models or Y-up. We try reasonable offsets.
    
    // Using a distance of ~8 units to see the whole shirt
    const distance = 8;
    const height = 0.5; // Look slightly up/down

    let eye: number[] = [0, -distance, height]; // Default Front
    const target: number[] = [0, 0, height];

    switch (view) {
      case 'front':
        // Typically -Y is front in many tools, or +Z. 
        // Let's assume Front is facing -Y direction, so camera is at -Y looking at +Y? 
        // Or Camera at -Y looking at Origin.
        eye = [0, -distance, height];
        break;
      case 'back':
        eye = [0, distance, height];
        break;
      case 'left':
        eye = [-distance, 0, height];
        break;
      case 'right':
        eye = [distance, 0, height];
        break;
    }

    this.api.setCameraLookAt(eye, target, 2); // 2 second animation
  }
}
