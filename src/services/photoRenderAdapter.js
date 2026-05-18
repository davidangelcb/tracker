export function adaptPhotoForRender(photo) {
  console.log('photo.date', photo.date);
  
  return {
    url: photo.downloadUrl,
    date: photo.date
      ? new Date(photo.date).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    description: photo.comment || "",
  };
}
