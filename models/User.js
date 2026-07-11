const mysqlOrm = require('mysql-orm');
const payrollSchema = require('./PayrollSchema');

const userSchema = new mysqlOrm.Schema(
  {
    role: {
      type: Number,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      default: "",
    },
    first_name: {
      type: String,
      required: false,
    },
    last_name: {
      type: String,
      required: false,
    },
    company_name: {
      type: String,
    },
    relationship: {
      type: String,
    },
    contact_type: {
      type: String,
      enum: ['person', 'company'],
    },
    dial_code: {
      type: String,
      minlength: 1,
      maxlength: 5,
      default: null,
    },
    iso_code: {
      type: String,
      minlength: 1,
      maxlength: 5,
      default: null,
    },
    phone: {
      type: String,
      minlength: 5,
      maxlength: 15,
      default: null,
    },
    send_sms: {
      type: Number,
      default: 0,
    },
    time_zone: {
      type: String,
      required: true,
      default: 'Australia/Sydney',
    },
    email: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      default: "",
    },
    token: {
      type: String,
      default: "",
    },
    gender: {
      type: Number,
    },
    profile_image: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
    },
    status: {
      type: Number,
      enum: [0, 1, 2, 3], // 0: Deactivate, 1: Activate, 2: Trial, 3: Waiting
      default: 1,
    },
    start_date: {
      type: Date,
      default: "",
    },
    end_date: {
      type: Date,
      default: "",
    },
    /**
     * extra fields for the tutor
     */
    calendar_color: {
      type: String,
      default: "",
    },
    subject_ids: [
      {
        type: "ObjectId",
        ref: "topics",
        default: null,
      },
    ],
    virtual_meeting_link: {
      type: String,
      default: '',
    },
    qualification: {
      type: String,
      default: "",
    },
    register_number: {
      type: String,
      default: "",
    },
    /**
     * extra field for student student start
     */
    ndis_number: {
      type: String,
      default: "",
    },
    account_number: {
      type: String,
      default: "",
    },
    skill_level: {
      type: String,
      default: "",
    },
    birth_day: {
      type: Date,
    },
    referrer: {
      type: String,
      default: "",
    },
    grade_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "grades",
      default: null,
    },
    school_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "schools",
      default: null,
    },
    group_tag_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "group_tags",
      default: null,
    },
    points_wallet_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "points_balance",
      default: null,
    },
    auto_invoice: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        name: {
          type: String,
          default: '',
          required: false,
        },
        size: {
          type: String,
          default: '',
          required: false,
        },
        extension: {
          type: String,
          default: '',
          required: false,
        },
        note: {
          type: String,
          default: '',
          required: false,
        },
      }
    ],
    availability_id: [{
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: 'tutor_availabilities',
      default: [],
      required: false,
    }],
    leave_request_ids: [{
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: 'tutor_leaves',
      default: [],
      required: false,
    }],
    payroll: [payrollSchema],
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Create indexes
userSchema.index({ username: 1 }, { unique: true, sparse: true });

// Pre-find middleware for 'count' queries
userSchema.pre("count", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndDelete' queries
userSchema.pre("findOneAndDelete", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
userSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
userSchema.pre("findOneAndUpdate", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
userSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
userSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
userSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Virtual populate for family contacts
userSchema.virtual("family_contacts", {
  ref: "family_contacts",            // model name
  localField: "_id",               // User._id
  foreignField: "student_id",      // FamilyContact.student_id
});

userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

// Helper function to generate username 
// Helper function to generate username 
userSchema.statics.generateUniqueUsername = async function(firstName, lastName, email) {
  let baseUsername = '';
  
  // Generate base username from first name and last name
  if (firstName && firstName.trim()) {
    if (lastName && lastName.trim()) {
      baseUsername = `${firstName.trim().toLowerCase()}_${lastName.trim().toLowerCase()}`;
    } else {
      baseUsername = firstName.trim().toLowerCase();
    }
  } else if (email && email.trim()) {
    // Use email prefix if no name available
    baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
  } else {
    baseUsername = 'student';
  }
  
  // Clean the username - remove special characters
  baseUsername = baseUsername.replace(/[^a-z0-9]/g, '_');
  baseUsername = baseUsername.replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  // Ensure baseUsername is not empty
  if (!baseUsername || baseUsername.length < 2) {
    baseUsername = 'student';
  }
  
  // Limit base username length
  if (baseUsername.length > 30) {
    baseUsername = baseUsername.substring(0, 30);
  }
  
  // Try to generate unique username with random 4 digits
  let username = '';
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 20;
  
  while (!isUnique && attempts < maxAttempts) {
    // Generate 4 random digits (1000-9999)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    username = `${baseUsername}${randomDigits}`;
    
    // Check if username exists in database (case-insensitive)
    const existingUser = await this.findOne({ 
      username: username, 
      isDeleted: false 
    });
    
    if (!existingUser) {
      isUnique = true;
      break;
    }
    attempts++;
  }
  
  // If still not unique after max attempts, use timestamp
  if (!isUnique) {
    username = `${baseUsername}_${Date.now()}`;
    
    // Final check with timestamp
    const finalCheck = await this.findOne({ 
      username: username, 
      isDeleted: false 
    });
    
    if (finalCheck) {
      // Ultra fallback - add microsecond timestamp
      username = `${baseUsername}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
  }
  
  return username;
};

const User = mysqlOrm.model("users", userSchema);
module.exports = User;
