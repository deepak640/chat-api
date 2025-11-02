function extractPublicId(url: string) {
  const parts = url.split("/");
  const filename = parts[parts.length - 1]; // abc123xyz.jpg
  const folder = parts[parts.length - 2]; // uploads
  return folder + "/" + filename.split(".")[0]; // uploads/abc123xyz
}

export default extractPublicId;
