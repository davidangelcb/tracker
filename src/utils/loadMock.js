import fs from "fs";
import path from "path";

export function loadMock(relativePath) {
  try {
    const mockPath = path.join(process.cwd(), relativePath);
    const fileContent = fs.readFileSync(mockPath, "utf8");
    return JSON.parse(fileContent);
  } catch (err) {
    console.error("Error cargando mock:", err);
    return null;
  }
}
