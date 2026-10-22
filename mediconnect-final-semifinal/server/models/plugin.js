// Shared toJSON: expose `_id` as `id`, hide `__v` and any sensitive fields.
module.exports = function jsonPlugin(schema) {
  schema.set("toJSON", {
    virtuals: false,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    }
  });
};
