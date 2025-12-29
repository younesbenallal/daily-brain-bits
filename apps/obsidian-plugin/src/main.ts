import { Plugin } from "obsidian";

export default class DailyBrainBitsPlugin extends Plugin {
  async onload() {
    console.log("Loading Daily Brain Bits plugin");
    // Plugin initialization code here
  }

  onunload() {
    console.log("Unloading Daily Brain Bits plugin");
  }
}
