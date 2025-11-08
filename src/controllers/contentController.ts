import { NextFunction, Request, Response } from "express";
import { ContentValidationSchema, DeleteContentParamsSchema } from "../utils/zodSchemas";
import { Content } from "../models/contentModel";
import { Tag } from "../models/tagModel";//

export const postContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = ContentValidationSchema.safeParse(req.body);

    if (!result.success) {
      console.log(result.error);
      return res.status(400).json(result.error.flatten().fieldErrors);
    }
    for (let i = 0; i < result.data.tags.length; i++) {
      result.data.tags[i] = result.data.tags[i].toLowerCase();
    }
    const values = await Tag.find({
      value: { $in: result.data.tags },
    });

    result.data.tags = result.data.tags.filter(
      (tag) => !values.some((value) => value.value === tag)
    );

    const inserted = await Tag.insertMany(
      result.data.tags.map((tag) => ({ value: tag }))
    );

    const content = await Content.create({
      title: result.data.title,
      link: result.data.link,
      tags: [...values, ...inserted].map((tag) => tag._id),
      type: result.data.type,
      userId: req.userId,
    });

    return res.status(201).json({
      statusCode: 201,
      data: content,
      message: "Success",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contents = await Content.find({ userId: req.userId })
      .populate("tags", "value")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      statusCode: 200,
      data: contents,
      message: "Success",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const content = req.body.contentId;
    // Validate contentId
    // Assuming contentId is passed in the request body
    const validation = DeleteContentParamsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validation.error.flatten().fieldErrors);
    }

    if (!content) {
      return res.status(400).json({
        statusCode: 400,
        message: "Content ID is required",
        success: false,
      });
    }
    const deletedContent = await Content.findOneAndDelete({
      _id: content,
      userId: req.userId,
    });
    if (!deletedContent) {
      return res.status(404).json({
        statusCode: 404,
        message: "Content not found",
        success: false,
      });
    }
    return res.status(200).json({
      statusCode: 200,
      message: "Content deleted successfully",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
