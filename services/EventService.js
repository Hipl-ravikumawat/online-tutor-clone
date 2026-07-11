const mysqlOrm = require('mysql-orm');
const Event = require("../models/Event"); // adjust path to your Event model

/**
 * Event Service
 * Handles event-related updates when tied to transactions
 */
class EventService {
  /**
   * Link a transaction with an event
   * @param {ObjectId} eventId 
   * @param {ObjectId} transactionId 
   * @returns {Promise<Event>}
   */
  static async linkTransaction(eventId, transactionId) {
    if (!mysqlOrm.Types.ObjectId.isValid(eventId)) return null;

    const event = await Event.findById(eventId);
    if (!event) return null;

    // Example: Store the transaction ID in event record
    if (!event.transactions) event.transactions = [];
    event.transactions.push(transactionId);

    await event.save();
    return event;
  }

  /**
   * Mark event as paid (example business rule)
   * @param {ObjectId} eventId 
   */
  static async markAsPaid(eventId) {
    if (!mysqlOrm.Types.ObjectId.isValid(eventId)) return null;

    return await Event.findByIdAndUpdate(
      eventId,
      { $set: { status: "paid" } },
      { new: true }
    );
  }
}

module.exports = EventService;
