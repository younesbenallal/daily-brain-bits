import { Client } from "@notionhq/client";

async function inspectDatabase() {
  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.argv[2];

  if (!notionToken || !databaseId) {
    console.error("❌ Usage: bun run src/inspect-notion-db.ts <DATABASE_ID>");
    process.exit(1);
  }

  const notion = new Client({ auth: notionToken });

  try {
    console.log("🔍 Inspection de la database Notion...");
    console.log("=".repeat(50));

    // Récupérer les métadonnées de la database
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    console.log("\n📊 Propriétés disponibles:");

    Object.entries(database.properties).forEach(
      ([name, property]: [string, any]) => {
        console.log(`  - ${name} (${property.type})`);
      }
    );

    console.log("\n📄 Récupération des pages...");

    // Récupérer quelques pages sans filtre
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 3,
    });

    console.log(`✅ ${response.results.length} page(s) trouvée(s)`);

    response.results.forEach((page: any, index) => {
      console.log(`\n📝 Page ${index + 1}:`);
      console.log(`   ID: ${page.id}`);

      Object.entries(page.properties).forEach(
        ([propName, propValue]: [string, any]) => {
          let value = "vide";

          if (propValue.type === "title" && propValue.title?.length > 0) {
            value = propValue.title[0]?.plain_text || "vide";
          } else if (
            propValue.type === "rich_text" &&
            propValue.rich_text?.length > 0
          ) {
            value = propValue.rich_text[0]?.plain_text || "vide";
          } else if (propValue.type === "select" && propValue.select) {
            value = propValue.select.name || "vide";
          }

          console.log(`   ${propName}: ${value}`);
        }
      );
    });
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

inspectDatabase();
