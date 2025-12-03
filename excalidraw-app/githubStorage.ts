// GitHub storage for auto-saving drawings
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "";
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || "Trillient/excalidraw-data";
const GITHUB_FILE = "drawing.excalidraw";

interface GitHubFileResponse {
  sha: string;
  content: string;
}

interface ExcalidrawData {
  type: string;
  version: number;
  source: string;
  elements: any[];
  appState: any;
  files?: Record<string, any>;
}

let currentSha: string | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Load drawing from GitHub
export const loadFromGitHub = async (): Promise<ExcalidrawData | null> => {
  if (!GITHUB_TOKEN) {
    console.warn("GitHub token not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (response.status === 404) {
      console.log("No saved drawing found on GitHub");
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data: GitHubFileResponse = await response.json();
    currentSha = data.sha;
    
    // GitHub API returns base64 with newlines - strip them before decoding
    const base64Clean = data.content.replace(/\n/g, "");
    const binaryString = atob(base64Clean);
    // Decode UTF-8 properly
    const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
    const content = new TextDecoder().decode(bytes);
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to load from GitHub:", error);
    return null;
  }
};

// Save drawing to GitHub (debounced)
export const saveToGitHub = (elements: any[], appState: any, files: BinaryFiles) => {
  if (!GITHUB_TOKEN) {
    return;
  }

  // Debounce saves - wait 2 seconds after last change
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      // Convert files map to a serializable object
      const filesData: Record<string, any> = {};
      if (files) {
        for (const [fileId, fileData] of Object.entries(files)) {
          filesData[fileId] = {
            id: fileData.id,
            mimeType: fileData.mimeType,
            dataURL: fileData.dataURL,
            created: fileData.created,
            lastRetrieved: fileData.lastRetrieved,
          };
        }
      }

      const data: ExcalidrawData = {
        type: "excalidraw",
        version: 2,
        source: "https://excalidrw.netlify.app",
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        files: filesData,
      };

      // Encode UTF-8 properly to base64
      const jsonString = JSON.stringify(data, null, 2);
      const bytes = new TextEncoder().encode(jsonString);
      const binaryString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
      const content = btoa(binaryString);

      const body: any = {
        message: `Auto-save ${new Date().toISOString()}`,
        content,
      };

      if (currentSha) {
        body.sha = currentSha;
      }

      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      currentSha = result.content.sha;
      console.log("✅ Saved to GitHub (with files)");
    } catch (error) {
      console.error("Failed to save to GitHub:", error);
    }
  }, 2000);
};

export const isGitHubConfigured = () => !!GITHUB_TOKEN;

