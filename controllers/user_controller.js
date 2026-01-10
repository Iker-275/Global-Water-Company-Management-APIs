const User = require("../models/userModel");

// =====================================
// GET ALL USERS (pagination optional)
// =====================================
const getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments()
    ]);

    return res.json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      data: users
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// GET USER BY ID
// =====================================
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({ success: true, data: user });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// UPDATE USER (email / role / active)
// =====================================
const updateUser = async (req, res) => {
  try {
    const { email, role, active } = req.body;

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "User updated successfully",
      data: user
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// TOGGLE USER ACTIVE STATUS
// =====================================
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.active = !user.active;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.active ? "activated" : "deactivated"} successfully`,
      data: {
        id: user._id,
        active: user.active
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// DELETE USER (HARD DELETE)
// =====================================
const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {getAllUsers,getUserById,updateUser,deleteUser,toggleUserActive};