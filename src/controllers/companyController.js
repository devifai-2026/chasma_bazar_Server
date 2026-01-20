import Company from '../models/Company.js';

export const createCompany = async (req, res) => {
  try {
    const { name, description, address, weblinks, email, phone, logo, establishedYear, rating, totalRatings } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required',
      });
    }

    if (!address || !address.pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Address with pinCode is required',
      });
    }

    const company = new Company({
      name,
      description,
      address,
      weblinks: weblinks || [],
      email,
      phone,
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
    const { name, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    const companies = await Company.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Company.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: companies.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
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
