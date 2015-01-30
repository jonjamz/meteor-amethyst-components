loaded = {} # Prevent reloading subjects if already active

A.subjects.save
  name: 'feature'
  options:
    loaded: (subjects..., computation) ->
      if !Meteor.isClient then throw new Error "Features cannot be used on the server!"

      # Control the computation
      A.subjects.load @, ['CF__safeReactiveProperties', [
        _stop:
          default: false
          schema: Boolean
        pause:
          default: false
          schema: Boolean
      ]]

      # Don't mistake the last subject for the computation
      if computation? and typeof computation is 'string'
        subjects.push computation

      # Load subjects into namespaces on the feature
      # At the feature level, probably best to not allow passing args to loaded
      # Prepare all the subjects before loading into a feature, the feature just sets up
      # groups of subjects and manages intentional side effects

      for subject in subjects
        if not loaded[subject]? # Singleton?
          loaded[subject] = {}
          A.subjects.load loaded[subject], subject
        @[subject] = loaded[subject] # Reference locally

      # Start the controllable reactive computation with Deps.autorun
      if computation? and typeof computation is 'function'
        @_computation = Deps.autorun (c) =>
          if @get('_stop') is true
            c.stop()
          else if @get('pause') is true
            return
          else
            computation.call @

    unloaded: ->
      @set '_stop', true


