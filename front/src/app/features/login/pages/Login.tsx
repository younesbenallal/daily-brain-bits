import React from "react";
import Stepper from "../../stepper/pages/Stepper";
import Image from "next/image";

const Login = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-20">
      <Image src="/Subtract.svg" alt="Logo" width={100} height={100} />
      <div className="w-full">
        <Stepper />
      </div>
    </div>
  );
};

export default Login;
