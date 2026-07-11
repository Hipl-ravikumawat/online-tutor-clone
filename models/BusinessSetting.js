const mysqlOrm = require('mysql-orm');
const { required } = require("nodemon/lib/config");
const { generate } = require("randomstring");
var slugify = require("slugify");



const BusinessSettingSchema = new mysqlOrm.Schema(
  {
    name: {
      type: String,
      required: true,
      caseInsensitive: true,
    },
    primary_number: {
      type: Number,
      required: true,
      minlength: 5,
      maxlength: 15,
    },
    primary_email: {
      type: String,
      required: true,
    },
    notification_settings : [{
      send_birthday_email: {
        type: Boolean,
        default: false,
        required: true,
      }
    }],
    event_scheduling:[ {
      check_scheduling_conflict: { type: Boolean, default: false, required: true },
    }],
    cancellation_policy: [
      {
        allow_event_cancellation: {
          type: Boolean,
          default: false,
          required: true,
        },
        prior_cancellation_time: {
          type: Number,
          default: 24,
          required: true,
        },
        notify_on_cancellation: {
          type: Boolean,
          default: false,
          required: true,
        },
        event_cancelled_before_deadline: {
          type: String,
          default: null,
          required: false,
        },
        event_cancelled_after_deadline: {
          type: String,
          default: null,
          required: false,
        },
        policy_text: {
          type: String,
          default: null,
          required: false,
        },
      },
    ],
    sales_taxes: {
        type: [
          {
            _id: {
              type: mysqlOrm.Schema.Types.ObjectId,
              default: () => new mysqlOrm.Types.ObjectId(),
            },
            tax_name: {
              type: String,
              required: true,
            },
            tax_rate: {
              type: Number,
              required: true,
            },
            is_default: {
              type: Boolean,
              default: false,
              required: false,
            }
          }
        ],
        default: [],
        required: false,
    },
    family_contact_settings: [
      {
        payment_methods:{
          type: [
            {
              _id: {
                type: mysqlOrm.Schema.Types.ObjectId,
                default: () => new mysqlOrm.Types.ObjectId(),
              },
              method: {
                type: String,
                required: true,
              }
            }
          ],
          default: [],
          required: false,
        },
        balance_date_type:{
          type: String,
          default:'',
          required: false,
        },
        specific_day:{
          type: Number,
          default: '',
          required: false,
        },
        specific_date:{
          type: Date,
          default: '',
          required: false,
        }
      }
    ],
    invoice_settings: [
      {
        automatic_late_payment_fee:{
          type: Array,
          default: [],
          required: false,
        },
        notifications_reminders:{
          type: Array,
          default: [],
          required: false,
        },
        overdue_reminder_day:{
          type: String,
          default: '',
          required: false,
        },
        email_time_frame:{
          type: String,
          default: '',
          required: false,
        },
      }
    ],
    invoice_formatting: [
      { 
        invoice_logo:{
          type: String,
          default: '',
          required: false,
        },
        invoice_name:{
          type: String,
          default: '',
          required: false,
        },
        invoice_number:[
          {
            generate_invoice_number: {
              type: Boolean,
              default: false,
              required: true,
            },
            invoice_number_format:{
              type: String,
              default: '',
              required: false,
            },
            next_invoice_number:{
              type: Number,
              default: '',
              required: false,
            },
          }
        ],
        negative_invoices:{
          type: String,
          default: '',
          required: true,
        },
        options:{
          type: Array,
          default: [],
          required: false,
        },
        invoice_footer_text:{
          type: String,
          default: '',
          required: false,
        },
        invoice_accent_color:{
          type: String,
          default: '',
          required: false,
        }

      }
    ]
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const BusinessSetting = mysqlOrm.model(
  "business_settings",
  BusinessSettingSchema
);
module.exports = BusinessSetting;