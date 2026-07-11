const mysqlOrm = require('mysql-orm');

const chargeCategorySchema = new mysqlOrm.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        caseInsensitive: true // Case-insensitive matching for the index
    },
    deleted_at: {
        type: Date,
        default: null
    }
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const ChargeCategory = mysqlOrm.model('charge_categories', chargeCategorySchema);

module.exports = ChargeCategory;