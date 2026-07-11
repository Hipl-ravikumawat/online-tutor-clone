  const mysqlOrm = require('mysql-orm');
  const StaffAutoInvoicingSchema = new mysqlOrm.Schema({
    // Reference to student/family (if per-student settings)
    tutorId: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: 'users',
      required: false // Optional if settings are business-wide
    },
    // Step 1: Invoice Details
    invoiceDetails: {
      billingCycleStartDate: {
        type: Date,
        required: true
      },
      
      invoiceFor: [{
        type: String,
        enum: ['upcoming_lessons', 'previous_lessons'],
        required: true
      }],
      
      invoiceCreationDate: {
        option: {
          type: String,
          enum: ['first_day_of_billing_cycle', 'choose_date'],
          required: true
        },
        customDate: {
          type: Date,
          default: null
        },
        daysBeforeBillingStart: {
          type: Number,
          default: 0
        }
      },
      
      dueDateSetup: {
        option: {
          type: String,
          enum: ['no_due_date', 'choose_date'],
          required: true
        },
        customDate: {
          type: Date,
          default: null
        },
        daysAfterInvoiceDate: {
          type: Number,
          default: 0
        }
      },
      
      autoInvoicingSchedule: {
        frequency: {
          type: String,
          enum: ['monthly', 'weekly', 'quarterly', 'yearly'],
          default: 'monthly'
        },
        repeatsEvery: {
          type: Number,
          default: 1
        },
        repeatOption: {
          type: String,
          enum: ['monthly_on_day', 'monthly_on_first_weekday'],
          default: 'monthly_on_day'
        },
      }
    },
    
    // Step 2: Preferences
    preferences: {
      displayStyle: {
        type: String,
        enum: ['normal', 'condensed', 'expanded'],
        default: 'normal'
      },      
      zeroBalanceHandling: {
        type: String,
        enum: ['skip_invoice', 'create_anyways'],
        default: 'skip_invoice'
      },      
      balanceForward: {
        type: Boolean,
        default: false
      },      
      autoEmail: {
          type: Boolean,
          default: false
      },      
      footerNote: {
        type: String,
        default: ''
      }
    },    
    // Metadata
    isActive: {
      type: Boolean,
      default: true
    },    
    createdAt: {
      type: Date,
      default: Date.now
    },    
    updatedAt: {
      type: Date,
      default: Date.now
    },
    created_by: { type: mysqlOrm.Schema.Types.ObjectId, ref: "users" },
    lastProcessed: {
      type: Date,
      default: null
    }
  });

  // Index for efficient querying
  StaffAutoInvoicingSchema.index({ tutorId: 1, isActive: 1 });
  StaffAutoInvoicingSchema.index({ 'invoiceDetails.billingCycleStartDate': 1 });

  // Update timestamp on save
  StaffAutoInvoicingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
  });

  module.exports = mysqlOrm.model('staff_auto_invoicing', StaffAutoInvoicingSchema);