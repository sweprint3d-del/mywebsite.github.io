"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function ThreeDViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="h-64 w-full border">
      <Canvas>
        <ambientLight />
        <OrbitControls />
        <Model url={fileUrl} />
      </Canvas>
    </div>
  );
}
