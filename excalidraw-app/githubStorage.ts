// GitHub storage for auto-saving drawings
import type { ExcalidrawElement } from "../packages/excalidraw/element/types";
import type { BinaryFiles } from "../packages/excalidraw/types";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "";
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || "Trillient/excalidraw-data";
const GITHUB_FILE = "drawing.excalidraw";

interface GitHubFileResponse {
  sha: string;
  content: string;
}

let currentSha: string | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Strips out files which are only referenced by deleted elements
 */
const filterOutDeletedFiles = (
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles,
): BinaryFiles => {
  const nextFiles: BinaryFiles = {};
  for (const element of elements) {
    if (
      !element.isDeleted &&
      "fileId" in element &&
      element.fileId &&
      files[element.fileId]
    ) {
      nextFiles[element.fileId] = files[element.fileId];
    }
  }
  return nextFiles;
};

// Load drawing from GitHub
export const loadFromGitHub = async (): Promise<any | null> => {
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
    
    const content = atob(data.content);
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to load from GitHub:", error);
    return null;
  }
};

// Save drawing to GitHub (debounced)
export const saveToGitHub = (
  elements: readonly ExcalidrawElement[],
  appState: any,
  files: BinaryFiles,
) => {
  if (!GITHUB_TOKEN) {
    return;
  }

  // Debounce saves - wait 2 seconds after last change
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      const data = {
        type: "excalidraw",
        version: 2,
        source: "https://excalidrw.netlify.app",
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        files: filterOutDeletedFiles(elements, files),
      };

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

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
      console.log("✅ Saved to GitHub");
    } catch (error) {
      console.error("Failed to save to GitHub:", error);
    }
  }, 2000);
};

export const isGitHubConfigured = () => !!GITHUB_TOKEN;

