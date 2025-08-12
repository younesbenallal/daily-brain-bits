import React from "react";
import Card from "@/app/components/card/Card";
import TutorialNotionImg from "../../../../../public/tutorial.svg";
import Image from "next/image";

const TutorialNotion = () => {
  return (
    <Card
      title="How to prioritize a note"
      buttonLabel="Next"
      onButtonClick={() => {}}
    >
      <div>
        <p className="text-gray-light">Give us a place to swallow your notes</p>
      </div>
      {/* img */}
      <div className="mt-10">
        <Image
          src={TutorialNotionImg}
          alt="Notion"
          width={50}
          height={50}
          className="w-50 h-50 object-cover mx-auto"
        />
      </div>
      <p className="text-gray-light mt-10">
        Give us a place to swallow your notes
      </p>
    </Card>
  );
};

export default TutorialNotion;
