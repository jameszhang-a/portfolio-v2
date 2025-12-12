import { Canvas } from "@react-three/fiber";

import { Box } from "./components/Box";
import { OrbitControls } from "@react-three/drei";

export function Sandbox() {
  return (
    <div className="w-screen h-screen">
      <Canvas>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <Box position={[-1.2, 0, 0]} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
