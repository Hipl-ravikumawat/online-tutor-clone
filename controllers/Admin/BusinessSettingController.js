const mysqlOrm = require('mysql-orm');
const BusinessSetting = require("../../models/BusinessSetting");
const NotificationTemplate = require("../../models/NotificationTemplate");
var slugify = require('slugify');
const GlobalConstants = require("../../_helper/GlobalConstants");
const saveInvoiceSettingsRequest = require('../../requests/BusinessSetting/SaveInvoiceBusinessRequest');
const { validationResult } = require("express-validator");

module.exports = {
  index,
  storeSalesTax,
  updateSalesTax,
  destroySalesTax,
  storeNotificationTemplate,
  editNotificationTemplate,
  updateNotificationTemplate,
  modifySettings,
  destroyNotificationTemplate,
};


const slugify_options = {
  replacement: '-',  // replace spaces with replacement character, defaults to `-`
  remove: slugify(' ', { remove: /[`~!@#$%^&*()_\-+=\[\]{};:'"\\|\/,.<>?\s]/g }), // remove characters that match regex, defaults to `undefined`
  lower: true,       // convert to lower case, defaults to `false`
  strict: true,     // strip special characters except replacement, defaults to `false`
  locale: 'en',      // language code of the locale to use
  trim: true         // trim leading and trailing replacement chars, defaults to `true`
}

/**
 * business setting index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const businessSettingData = await BusinessSetting.find({}).limit(1);
    if(businessSettingData.length == 0){
      const newBusinessSetting = new BusinessSetting({
        name: `PioneersLearningHub`,
        primary_number: `918258741565`,
        primary_email: `alicia@pioneerstutoring.com`,
        notification_settings:{
          send_birthday_email: true
        },
        event_scheduling: [{
          check_scheduling_conflict: true,
        }],
        cancellation_policy: [
          {
            allow_event_cancellation: true,
            prior_cancellation_time: 24,
            notify_on_cancellation: true,
          },
        ],
      });
      await newBusinessSetting.save();
    }
    const notificationTemplates = await NotificationTemplate.find({});
    const businessSetting = businessSettingData[0];
    const smsTemplates = notificationTemplates.filter(
      (template) => template.type === "sms"
    );
    const emailTemplates = notificationTemplates.filter(
      (template) => template.type === "email"
    );
    return res.render("../views/admin/businessSettings/index", {
      smsTemplates: smsTemplates,
      emailTemplates: emailTemplates,
      businessSetting: businessSetting,
      currency: GlobalConstants.currency.symbol
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * business setting storeSalesTax.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function storeSalesTax(req, res) {
  try {
    const { tax_name, tax_rate } = req.body;
    
    const newTax = {
      _id: new mysqlOrm.Types.ObjectId(),
      tax_name,
      tax_rate,
    };

    // Update business settings with final data
    const updatedBusinessSetting = await BusinessSetting.findByIdAndUpdate(req.body.uniqueId, { $push: { sales_taxes: newTax } });

    if (updatedBusinessSetting) {
      let msg = "The Sales tax settings are added successfully.";
      req.flash("success", msg);
      res.redirect("/business-settings");
    } else {
      req.flash("error", "The data was not updated.");
      res.redirect("/business-settings");
    } 
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * business setting storeSalesTax.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateSalesTax(req, res) {
  try {
    const { tax_id, tax_name, tax_rate } = req.body;
    
    const updatedBusinessSetting = await BusinessSetting.updateOne(
      { "sales_taxes._id": tax_id },
      {
        $set: {
          "sales_taxes.$.tax_name": tax_name,
          "sales_taxes.$.tax_rate": tax_rate,
        },
      }
    );

    if (updatedBusinessSetting) {
      let msg = "The Sales tax settings are updated successfully.";
      req.flash("success", msg);
      res.redirect("/business-settings");
    } else {
      req.flash("error", "The data was not updated.");
      res.redirect("/business-settings");
    } 
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * business setting destroySalesTax.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroySalesTax(req, res) {
  try {
    await BusinessSetting.findByIdAndUpdate(req.body.uniqueId, {
      $pull: { sales_taxes: { _id: req.params.id } },
    });

    let crudMessage = "Sales tax is deleted successfully!";
    req.flash("success", crudMessage);
    res.status(200).json({ success: true, message: crudMessage,redirectUrl:'page-reload' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function deleteSalesTax(req, res) {
  try {

  }catch (error) {
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * business setting storeNotificationTemplate.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function storeNotificationTemplate(req, res) {
  try {
    let slug = slugify(req.body.title, slugify_options);
    req.body.slug = slug;    
    let fetchTemplate = await NotificationTemplate.find({slug:slug,type:req.body.type});
    
    if(fetchTemplate.length ==0){
      let response = await NotificationTemplate.create(req.body);
      let crudMessage = "Template is added successfully!";
      req.flash("success", crudMessage);
      res.redirect("/business-settings");
    }else{
      let crudMessage = "The Template Name is already in used. Please choose other name!";
      req.flash("error", crudMessage);
      res.redirect("/business-settings");
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * business setting storeNotificationTemplate.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function editNotificationTemplate(req, res) {
  try {

    let { id } = req.body;
    let response = await NotificationTemplate.findById(id);
    return res.send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * business setting storeNotificationTemplate.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateNotificationTemplate(req, res) {
  try {
    let templateId = req.body.template_id;
    let response = await NotificationTemplate.findByIdAndUpdate(
      templateId,
      req.body
    );

    let crudMessage = "Template is updated successfully!";
    req.flash("success", crudMessage);
    res.status(200).json({ success: true, message: crudMessage });
    // res.redirect('/business-settings');
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}


/**
 * business setting destroyNotificationTemplate.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroyNotificationTemplate(req, res) {
  try {
    let templateId = req.params.id;
    let response = await NotificationTemplate.findByIdAndDelete(templateId);

    let crudMessage = "Template is deleted successfully!";
    req.flash("success", crudMessage);
    res.status(200).json({ success: true, message: crudMessage,redirectUrl:'page-reload' });
    // res.redirect('/business-settings');
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * modify the business settings.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function modifySettings(req, res) {
  try {
    const currentTab = req.body.currentTab;
    const currentSection = req.body.currentSection;
    if(req.body.uniqueId != "" && currentSection == "invoice-setting"){
      if(req.body.currentTab == "invoice-formatting"){
        let result = await saveInvoiceFormatting(req,res);
      }else if(req.body.currentTab == "family-account"){
        let result = await saveFamilyAccountSettings(req,res);
      }else{
          const validators = saveInvoiceSettingsRequest.filter(v => typeof v.run === "function")
         await Promise.all(validators.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({ errors: errors.array() });
        }

        let result = await saveInvoiceSettings(req,res);
      }
    }
    if (req.body.uniqueId != "" && currentSection == "event-schedule") {
      let event_scheduling = [
        {
          check_scheduling_conflict: req.body.check_scheduling_conflict
            ? true
            : false,
        },
      ];

      const updatedBusinessSetting = await BusinessSetting.updateOne(
        { _id: req.body.uniqueId },
        { event_scheduling: event_scheduling }
      );

      let msg = "The " + currentTab + " settings are updated successfully.";
      req.flash("success", msg);
      res.status(201).json({
        success: true,
        message: msg,
      });
    }

    if (req.body.uniqueId != "" && currentSection == "contact-information") {
        const updatedBusinessSetting = await BusinessSetting.updateOne(
            { _id: req.body.uniqueId },
            {
                $set: {
                    primary_number: req.body.primary_number,
                    primary_email: req.body.primary_email
                }
            }
        );

        let msg = "The " + currentTab + " settings are updated successfully.";
        req.flash("success", msg);
        res.status(201).json({
            success: true,
            message: msg,
        });
    }

    if (req.body.uniqueId != "" && currentSection == "email-setting") {
      let notification_settings = [
        {
          send_birthday_email: req.body.send_birthday_email ? true : false,
        },
      ];

      let updatedObj = {
        primary_email: req.body.primary_email,
        notification_settings: notification_settings,
      };

      const updatedBusinessSetting = await BusinessSetting.updateOne(
        { _id: req.body.uniqueId },
        updatedObj
      );

      let msg = "The " + currentTab + " settings are updated successfully.";
      req.flash("success", msg);
      res.status(201).json({
        success: true,
        message: msg,
      });
    }

    if (req.body.uniqueId != "" && currentSection == "cancellation") {
      let cancellation_policy = [
        {
          allow_event_cancellation: req.body.allow_event_cancellation
            ? true
            : false,
          prior_cancellation_time: req.body.prior_cancellation_time,
          notify_on_cancellation: req.body.notify_on_cancellation
            ? true
            : false,
          event_cancelled_before_deadline:
            req.body.event_cancelled_before_deadline,
          event_cancelled_after_deadline:
            req.body.event_cancelled_after_deadline,
          policy_text: req.body.policy_text,
        },
      ];

      let updatedObj = {
        cancellation_policy: cancellation_policy,
      };

      const updatedBusinessSetting = await BusinessSetting.updateOne(
        { _id: req.body.uniqueId },
        updatedObj
      );

      let msg = "The " + currentTab + " settings are updated successfully.";
      req.flash("success", msg);
      res.status(201).json({
        success: true,
        message: msg,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * modify the business settings.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function saveInvoiceSettings(req, res) {
  try {
    // Define late payment fee object based on invoice name
    let latePaymentFee = '';
    if (req.body.payment_fee_type === '2') {
      latePaymentFee = {
        payment_fee_type: req.body.payment_fee_type,
        late_fee_amount: req.body.late_fee_amount,
        number_of_days: req.body.number_of_days,
        category: req.body.category,
      };
    }else if (req.body.payment_fee_type === '3') {
      latePaymentFee = {
        payment_fee_type: req.body.payment_fee_type,
        late_fee_amount: req.body.late_fee_percentage,
        number_of_days: req.body.percentage_number_of_days,
        category: req.body.percentage_category,
      };
    } else {
      latePaymentFee = {
        payment_fee_type: req.body.payment_fee_type,
      };
    }
    // Construct final data object
    const finalData = {
      automatic_late_payment_fee: latePaymentFee,
      notifications_reminders: req.body.scheduling,
      overdue_reminder_day: (req.body.scheduling.includes('2') ? req.body.overdue_reminder_day :''),
      email_time_frame: req.body.email_time_frame,
    };
    // Update business settings with final data
    const updatedBusinessSetting = await BusinessSetting.findByIdAndUpdate(req.body.uniqueId, { invoice_settings: finalData });

    if (updatedBusinessSetting) {
      let msg = "The " + req.body.currentTab + " settings are updated successfully.";
      // req.flash("success", msg);
      return res.status(201).json({
        success: true,
        message: msg,
      });
    } else {
      req.flash("error", "The data was not updated.");
      return res.status(201).json({
        success: false,
        message: "The data was not updated.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * modify the business settings.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function saveInvoiceFormatting(req, res) {
  try {
    // Define late payment fee object
    let latePaymentFee = {
      generate_invoice_number: req.body.invoice_number === '1' ? true : false,
      invoice_number_format: req.body.invoice_number_format,
      next_invoice_number: req.body.next_invoice_number,
    };
    
    // Construct final data object
    const finalData = {
      invoice_logo: '',
      invoice_name: req.body.invoice_name,
      invoice_number: latePaymentFee,
      negative_invoices: req.body.negative_invoice,
      options: req.body.invoice_option,
      invoice_footer_text: req.body.invoice_footer_text,
      invoice_accent_color: req.body.invoice_color,
    };
    
    // Update business settings with final data
    const updatedBusinessSetting = await BusinessSetting.findByIdAndUpdate(req.body.uniqueId, { invoice_formatting: finalData });

    if (updatedBusinessSetting) {
      let msg = "The " + req.body.currentTab + " settings are updated successfully.";
      req.flash("success", msg);
      return res.status(201).json({
        success: true,
        message: msg,
      });
    } else {
      return res.status(201).json({
        success: false,
        message: "The data was not updated.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * modify the business settings.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function saveFamilyAccountSettings(req, res) {
  try {    
    // Construct final data object
    const specificDate = req.body.specific_date
      ? new Date(new Date(req.body.specific_date).toISOString().split('T')[0]) // removes time
      : null;

    const methods = req.body.payment_mothods || [];
    
    const formattedMethods = Array.isArray(methods)
      ? methods.map(method => ({
          _id: new mysqlOrm.Types.ObjectId(),
          method: method.trim()
        }))
      : [];
    
    const finalData = {
      payment_methods: formattedMethods,
      balance_date_type: req.body.balance_date_type,
      specific_day: req.body.specific_day,
      specific_date: specificDate,
    };

    // Update business settings with final data
    const updatedBusinessSetting = await BusinessSetting.findByIdAndUpdate(req.body.uniqueId, { family_contact_settings: finalData });

    if (updatedBusinessSetting) {
      let msg = "The " + req.body.currentTab + " settings are updated successfully.";
      // req.flash("success", msg);
      return res.status(201).json({
        success: true,
        message: msg,
      });
    } else {
      req.flash("error", "The data was not updated.");
      return res.status(201).json({
        success: false,
        message: "The data was not updated.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}
