// Configuration State Types
export interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface TextState {
  content: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  transform: TransformState;
}

export interface ImageState {
  src: string | null;
  transform: TransformState;
}

// Single View Configuration (Front or Back)
export interface ViewConfig {
  text: TextState;
  image: ImageState;
}

// Global Config
export interface ConfigState {
  baseColor: string;
  front: ViewConfig;
  back: ViewConfig;
}

// Sketchfab API Types (Mocked for TypeScript)
export interface SketchfabAPI {
  start: () => void;
  addEventListener: (event: string, callback: any) => void;
  getMaterialList: (callback: (err: any, materials: SketchfabMaterial[]) => void) => void;
  setMaterial: (material: SketchfabMaterial, callback: (err: any, result: any) => void) => void;
  addTexture: (url: string, callback: (err: any, textureUid: string) => void) => void;
  getTextureList: (callback: (err: any, textures: any[]) => void) => void;
  setCameraLookAt: (eye: number[], target: number[], duration: number, callback?: (err: any) => void) => void;
}

export interface SketchfabMaterial {
  name: string;
  channels: {
    [key: string]: {
      enable: boolean;
      factor: number;
      texture?: {
        uid: string;
        internalFormat?: string;
        magFilter?: string;
        minFilter?: string;
        texCoordUnit?: number;
        textureTarget?: string;
        wrapS?: string;
        wrapT?: string;
      };
      color?: number[]; 
    };
  };
}

export interface SketchfabClient {
  init: (uid: string, config: any) => void;
}

declare global {
  interface Window {
    Sketchfab: new (version: string, iframe: HTMLIFrameElement) => SketchfabClient;
  }
}