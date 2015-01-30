var validator = {
  name: 'validator',
  options: {
    api: {
      check: function (obj, schema) {
        check(obj, Match.ObjectIncluding(schema));
      }
    }
  }
};

A.subjects.save(validator);