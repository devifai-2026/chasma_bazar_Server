import UserDeliveryAddress from '../models/UserDeliveryAddress.js';

export const addAddress = async (req, res) => {
  try {
    const { name, addressType, address, city, state, country, pincode, phone, alternatePhone, landmark, isDefault } = req.body;
    const userId = req.user.userId;

    if (!name || !address || !city || !state || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, city, state, pincode, and phone are required',
      });
    }

    const deliveryAddress = new UserDeliveryAddress({
      userId,
      name,
      addressType,
      address,
      city,
      state,
      country,
      pincode,
      phone,
      alternatePhone,
      landmark: landmark || '',
      isDefault: isDefault || false,
    });

    await deliveryAddress.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: deliveryAddress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const addresses = await UserDeliveryAddress.find({
      userId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const address = await UserDeliveryAddress.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const address = await UserDeliveryAddress.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const updatedAddress = await UserDeliveryAddress.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: updatedAddress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const address = await UserDeliveryAddress.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    await UserDeliveryAddress.findByIdAndUpdate(id, { isDeleted: true });

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
