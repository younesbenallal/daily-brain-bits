import React, { useState, useEffect, useRef } from "react";
import Card from "@/app/components/card/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useNotion, NotionDatabase } from "@/hooks/useNotion";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import MultiSelect from "@/app/components/select/MultiSelect";
import { Option } from "@/components/ui/multiselect";
import { useSaveNotionDatabase } from "../../notion-database/services/notion-databaseMutations";

interface SavedNotionDatabase {
  id: string;
  integrationId: string;
  databaseId: string;
  databaseTitle: string;
  createdAt: string;
  updatedAt: string;
}

interface ConfigureNotionProps {
  onNext?: () => void;
}

const ConfigureNotion: React.FC<ConfigureNotionProps> = ({ onNext }) => {
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const hasLoadedDatabases = useRef(false);
  const { isAuthenticated, user } = useAuth();
  const {
    isConnected,
    isSavingToken,
    connectToNotion,
    databases,
    isLoadingDatabases,
    fetchDatabases,
    savedNotionDatabases,
  } = useNotion();
  const { mutate: saveNotionDatabase } = useSaveNotionDatabase();

  const initialSelectedDatabases =
    savedNotionDatabases?.map((db: SavedNotionDatabase) => ({
      value: db.databaseTitle.toLowerCase(),
      label: db.databaseTitle,
    })) || [];

  const [selectedDatabases, setSelectedDatabases] = useState<Option[]>(
    initialSelectedDatabases
  );

  useEffect(() => {
    if (savedNotionDatabases?.length) {
      const savedOptions = savedNotionDatabases.map(
        (db: SavedNotionDatabase) => ({
          value: db.databaseTitle.toLowerCase(),
          label: db.databaseTitle,
        })
      );
      setSelectedDatabases(savedOptions);
    }
  }, [savedNotionDatabases]);

  useEffect(() => {
    if (
      isConnected &&
      isAuthenticated &&
      !hasLoadedDatabases.current &&
      !isLoadingDatabases
    ) {
      fetchDatabases();
      hasLoadedDatabases.current = true;
    }
  }, [isConnected, isAuthenticated, isLoadingDatabases, fetchDatabases]);

  useEffect(() => {
    const checkNotionConnection = async () => {
      if (!isCheckingToken) return;
      if (
        isConnected &&
        isAuthenticated &&
        !hasLoadedDatabases.current &&
        !isLoadingDatabases
      ) {
        try {
          await fetchDatabases();
          hasLoadedDatabases.current = true;
        } catch (error) {
          console.error("❌ Error fetching databases:", error);
        }
      }
      setIsCheckingToken(false);
    };
    checkNotionConnection();
  }, [
    isConnected,
    isAuthenticated,
    isCheckingToken,
    isLoadingDatabases,
    fetchDatabases,
  ]);

  const handleContinue = () => {
    const databaseIds = databases
      .map((notionDb: NotionDatabase) => {
        return selectedDatabases
          .filter(
            (selectedDb: Option) =>
              selectedDb.value === notionDb.title.toLowerCase()
          )
          .map(() => {
            return {
              id: notionDb.id,
              label: notionDb.title,
            };
          });
      })
      .flat();
    if (user?.email) {
      saveNotionDatabase({ databaseId: databaseIds, userEmail: user.email });
    }
    onNext?.();
  };

  if (isCheckingToken || isSavingToken || isLoadingDatabases) {
    return (
      <Card
        title="Configure Notion"
        buttonLabel={
          isSavingToken
            ? "Saving..."
            : isLoadingDatabases
            ? "Loading databases..."
            : "Loading..."
        }
        onButtonClick={() => {}}
        isLoading={true}
      >
        <div className="flex flex-col items-center justify-center py-10">
          <LoadingSpinner size="medium" />
          <p className="mt-4 text-gray-600">
            {isSavingToken
              ? "Saving your Notion connection..."
              : isLoadingDatabases
              ? "Loading your Notion databases..."
              : "Checking your Notion connection..."}
          </p>
        </div>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card
        title="Configure Notion"
        buttonLabel="Connect Notion first"
        onButtonClick={connectToNotion}
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Connect your Notion account to sync your notes and create spaced
            repetition cards.
          </p>
          <p className="text-gray-600">
            We'll only access the pages you explicitly share with us.
          </p>
        </div>
      </Card>
    );
  }

  const dbOptions = databases.map((db: NotionDatabase) => ({
    value: db.title.toLowerCase(),
    label: db.title,
  }));

  return (
    <Card
      title="Select yours Notions Database"
      buttonLabel={"Select a database first"}
      onButtonClick={handleContinue}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            Select a Notion database to use for your spaced repetition cards:
          </p>
        </div>

        {databases.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700">
              No databases found in your Notion workspace. Please create a
              database in Notion first.
            </p>
          </div>
        ) : (
          <MultiSelect
            options={dbOptions}
            placeholder="Select a database"
            label="Select a database"
            value={selectedDatabases}
            onChange={(selected) => {
              setSelectedDatabases(selected);
            }}
          />
        )}
      </div>
    </Card>
  );
};

export default ConfigureNotion;
