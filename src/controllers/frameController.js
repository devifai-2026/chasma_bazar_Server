import Frame from '../models/Frame.js';

export const createFrame = async (req, res) => {
  try {
    const { name, size, width, dimensions, frameDiscount } = req.body;

    if (!name || !size || !width || !dimensions) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    const frame = new Frame({
      name,
      size,
      width,
      dimensions,
      frameDiscount: frameDiscount || '0',
    });

    await frame.save();

    res.status(201).json({
      success: true,
      message: 'Frame created successfully',
      data: frame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateFrame = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const frame = await Frame.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!frame) {
      return res.status(404).json({
        success: false,
        message: 'Frame not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Frame updated successfully',
      data: frame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteFrame = async (req, res) => {
  try {
    const { id } = req.params;

    const frame = await Frame.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!frame) {
      return res.status(404).json({
        success: false,
        message: 'Frame not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Frame deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllFrames = async (req, res) => {
  try {
    const frames = await Frame.find({ isDeleted: false });

    res.status(200).json({
      success: true,
      data: frames,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFrame = async (req, res) => {
  try {
    const { id } = req.params;

    const frame = await Frame.findOne({ _id: id, isDeleted: false });

    if (!frame) {
      return res.status(404).json({
        success: false,
        message: 'Frame not found',
      });
    }

    res.status(200).json({
      success: true,
      data: frame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
