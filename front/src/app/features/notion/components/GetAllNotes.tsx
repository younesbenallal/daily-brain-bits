import { useNotion } from "@/hooks/useNotion";
import React, { useState, useEffect } from "react";
import { useGetAllNotesQuery } from "../services/notionQueries";
import Card from "@/app/components/card/Card";

const GetAllNotes = ({ onNext }: { onNext?: () => void }) => {
  const { notionIntegration, savedNotionDatabases } = useNotion();
  const [currentCard, setCurrentCard] = useState(1);

  const CARD_DISPLAY_DURATION = 1000;

  const { data: allNotes, isLoading: isLoadingAllNotes } = useGetAllNotesQuery(
    notionIntegration?.id || "",
    savedNotionDatabases?.map((db: any) => db.databaseId) || []
  );

  useEffect(() => {
    setCurrentCard(1);

    // Ne démarrer la rotation que si la requête est en cours
    if (isLoadingAllNotes) {
      const interval = setInterval(() => {
        setCurrentCard((prevCard) => (prevCard === 1 ? 2 : 1));
      }, CARD_DISPLAY_DURATION);

      return () => {
        clearInterval(interval);
      };
    } else {
      setCurrentCard(1);
      console.log("onNext");
      onNext?.();
    }
  }, [CARD_DISPLAY_DURATION, isLoadingAllNotes]);

  return (
    <>
      <div
        className={`transform transition-all duration-500 ease-in-out ${
          currentCard === 1
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        }`}
        style={{
          position: currentCard === 1 ? "relative" : "absolute",
          width: "100%",
          zIndex: currentCard === 1 ? 10 : 0,
        }}
      >
        <Card title="">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-dark">
              We are preparing your app
            </h1>
            {!isLoadingAllNotes && allNotes && (
              <div className="text-green-600 font-medium">
                ✓ Ready! Found {allNotes?.count || 0} notes
              </div>
            )}
          </div>
        </Card>
      </div>

      <div
        className={`transform transition-all duration-500 ease-in-out ${
          currentCard === 2
            ? "opacity-100 translate-x-0 scale-100"
            : "opacity-0 translate-x-8 scale-95 pointer-events-none"
        }`}
        style={{
          position: currentCard === 2 ? "relative" : "absolute",
          width: "100%",
          zIndex: currentCard === 2 ? 10 : 0,
          top: currentCard !== 2 ? "0" : "auto",
        }}
      >
        <Card title="">
          <div className="text-center space-y-4">
            <div className="relative">
              <h1 className="text-2xl font-bold text-red-dark">
                In the meantime, let us introduce you to the app
              </h1>

              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg opacity-50 animate-pulse"></div>
            </div>

            <p className="text-gray-600 text-sm">
              Setting up your personalized learning experience...
            </p>
          </div>
        </Card>
      </div>
    </>
  );
};

export default GetAllNotes;
