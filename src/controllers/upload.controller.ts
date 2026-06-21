import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded!" });
    }

    const file = req.file as any;
    return res.json({
      success: true,
      message: "Image uploaded successfully!",
      data: {
        url: file.path,
        publicId: file.filename,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Upload failed!" });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, message: "Public ID required!" });
    }

    await cloudinary.uploader.destroy(publicId);
    return res.json({ success: true, message: "Image deleted!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Delete failed!" });
  }
};