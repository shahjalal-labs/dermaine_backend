import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 3000 * 1024 * 1024 }, // 3000 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mpeg",
      "video/mp4",
      "audio/mpeg",
      "audio/mp3",
      "video/x-matroska",
      "audio/mpeg",
      "application/zip",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed") as unknown as null, false);
    }
    cb(null, true);
  },
});

// upload single image
const profileImage = upload.single("profileImage");
const galleryImage = upload.single("galleryImage");
const bannerImage = upload.single("bannerImage");
const reportImage = upload.single("reportUrl");
const highlightsVideo = upload.single("highlightsVideo");

// upload multiple image
const uploadMultiple = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "playerCard", maxCount: 1 },
  { name: "medicalCertificate", maxCount: 1 },
  { name: "expCertificate", maxCount: 1 },
  { name: "coachCard", maxCount: 1 },
  { name: "clubCard", maxCount: 1 },
  { name: "logo", maxCount: 1 },
  { name: "licence", maxCount: 1 },
]);

export const fileUploader = {
  upload,
  uploadMultiple,
  profileImage,
  galleryImage,
  highlightsVideo,
  bannerImage,
  reportImage,
};
