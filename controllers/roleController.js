const Role = require("../models/roleModel");

// =====================================
// CREATE ROLE
// =====================================
const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    const exists = await Role.findOne({ name: name.toLowerCase() });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Role already exists"
      });
    }

    const role = await Role.create({
      name: name.toLowerCase(),
      description
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// GET ALL ROLES
// =====================================
const getAllRoles = async (req, res) => {
  try {
    const { active } = req.query;

    const filter = {};
    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;

    const roles = await Role.find(filter).sort({ createdAt: 1 });

    return res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// GET ROLE BY ID
// =====================================
const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    return res.json({ success: true, data: role });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// UPDATE ROLE
// =====================================
const updateRole = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.toLowerCase();
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    return res.json({
      success: true,
      message: "Role updated successfully",
      data: role
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// DELETE ROLE
// =====================================
const deleteRole = async (req, res) => {
  try {
    const deleted = await Role.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    return res.json({
      success: true,
      message: "Role deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports={getAllRoles,getRoleById,updateRole,createRole,deleteRole};