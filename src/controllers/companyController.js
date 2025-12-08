import Company from '../models/Company.js';

export const createCompany = async (req, res) => {
  try {
    const { name, description, pinCode, weblinks, email, phone, address, logo, establishedYear, rating, totalRatings } = req.body;

    if (!description || !pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Description and pinCode are required',
      });
    }

    const company = new Company({
      name,
      description,
      pinCode,
      weblinks: weblinks || [],
      email,
      phone,
      address,
      logo,
      establishedYear,
      rating,
      totalRatings,
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const company = await Company.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ isDeleted: false });

    res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findOne({ _id: id, isDeleted: false });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
