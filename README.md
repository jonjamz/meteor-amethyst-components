Amethyst components (subjects) for Meteor
-----------------------------------------

Taken from an old private repository of mine, last updated *Feb 26, 2014!*

This was purely experimental, dealing with very granular reusable components.

From the pre-Blaze era, some of these probably won't work--not that anybody should try.

Example
-------

```coffeescript
# Control how subjects are namespaced inside components using methodFacade
# ------------------------------------------------------------------------

# Ensure that the component has the methodFacade subject
ensureFacade = ->
  unless @methodFacade?
    A.subjects.load @, 'methodFacade'

A.subjects.save
  name: 'CF__animations'
  options:
    loaded: ->
      ensureFacade.call @
      animations = {}
      A.subjects.load @, 'RMS__animations'

A.subjects.save
  name: 'CF__errors'
  options:
    loaded: ->
      ensureFacade.call @
      A.subjects.load @, 'errors'
      @methodFacade.map
        logifer: @errors.logifer
        flashifer: @errors.flashifer

# Subject
A.subjects.save
  name: 'CF__collectionFactory'
  options:
    # Takes collection names as arguments
    loaded: (options) ->
      ensureFacade.call @
      arr = []
      privateRef = {} # Don't load db on `this`, use loaded() instance encapsulation

      # Iterate through collections, getting the full object from config (lib/config/1.collections.coffee)
      for collection in arguments
        if config? and config.collections[collection]?
          arr.push config.collections[collection]
        else
          # if console?.log?
          #   console.log config.collections
          throw new Error "Collection #{collection} isn't defined in config!"
      A.subjects.load privateRef, ['sharedCollections', arr]
      @methodFacade.map
        db: (collection) -> privateRef.sharedCollections(collection)

A.subjects.save
  name: 'CF__pubSubs'
  options:
    loaded: (options) ->
      ensureFacade.call @
      if options?
        A.subjects.load @, ['pubSubs', [options]]
        @methodFacade.map
          getSub: @pubSubs.getSub

A.subjects.save
  name: 'CF__safeReactiveProperties'
  options:
    loaded: (options) ->
      ensureFacade.call @
      if options?
        A.subjects.load @, ['safeReactiveProperties', [options]]
        @methodFacade.map
          set: @safeReactiveProperties.set
          get: @safeReactiveProperties.get
          inc: @safeReactiveProperties.inc
          dec: @safeReactiveProperties.dec
          tog: @safeReactiveProperties.toggle
          setDefault: @safeReactiveProperties.setDefault
          setAllDefaults: @safeReactiveProperties.setAllDefaults

A.subjects.save
  name: 'CF__localTemplate'
  options:
    loaded: (options) ->
      ensureFacade.call @
      if options?
        A.subjects.load @, 'localTemplate'
        for own key, val of options
          val.template = key
          @localTemplate.create val
        @methodFacade.map
          getStaticTemplate: @localTemplate.getStatic
          getReactiveTemplate: @localTemplate.getReactive
          getTemplateAlias: @localTemplate.getAlias
          loadInto: @localTemplate.loadInto
          appendInto: @localTemplate.appendInto
          prependInto: @localTemplate.prependInto
          _loadIntoArea: @localTemplate._loadIntoArea
          _appendIntoArea: @localTemplate._appendIntoArea
          _prependIntoArea: @localTemplate._prependIntoArea
```

```coffeescript
# Build a component
# -----------------

observer = null # Watch for new content blocks

A.subjects.save
  name: 'repo__contentBlocks'
  options:
    subjects:
      CF__collectionFactory: ['Repositories', 'ContentBlocks']
      CF__pubSubs:
        uniqueName: 'repo__contentBlocks'
        currentRepoContentBlocks:
          publish: (options) ->
            if options?.repo?
              ContentBlocks.find
                repo: options.repo
          subscribe:
            options:
              repo: ->
                if Session.get('xCurrentRepo')
                  Session.get('xCurrentRepo')
            onReady: ->
              # console.log "repo__contentBlocks subscription ready!"

    unloaded: (options) ->
      observer.stop()

    loaded: (options) ->
      Meteor.defer => @pubSubs.startSubReactive 'currentRepoContentBlocks'

      # Observe the blocks and flash the alert bar whenever there's a new one created
      Meteor.defer =>
        observer = Deps.autorun =>
          @db('ContentBlocks').find
            repo: Session.get('xCurrentRepo')
            createdBy: $ne: Meteor.userId() # Don't flash if it's your own block
          .observeChanges
            added: (id, fields) ->
              now = new Date().getTime()
              posted = fields.createdAt.getTime()
              if (now - posted) < 10 * 1000
                if Routes.helpers?.repository?.layouts__threeColumnDynamic?
                  Routes.helpers.repository.layouts__threeColumnDynamic.triggerMiddleAlert()

      A.subjects.load @, 'CF__errors', 'CF__animations',

        ['CF__safeReactiveProperties', [

          activeRedactor:
            default: null
            schema: Match.OneOf null, String

          blockSort:
            default: 'manual'
            schema: String

        ]] # End CF__safeReactiveProperties

        ['methodFacade', [

          # Save and destroy all existing redactors (hopefully just one existing)
          # Except one (used for allowing only one redactor instance at a time)
          saveAndReleaseBlocks: (exceptId) ->
            for item in ($ '.active-redactor')
              if item.id isnt exceptId
                content = ($ item).redactor('get')
                if typeof content isnt 'string' then return undefined # Fail silently
                @db('ContentBlocks').update
                  _id: item.id
                ,
                  $set:
                    content: content
                    locked: false
                ($ item).redactor('destroy')
                ($ '.active-redactor').remove() # For when pressing escape during fs

          saveBlock: (id) ->
            content = ($ "##{id}").redactor('get')

            # Rarely, `content` is assigned a jQuery object. Check if it's a string and
            # fail silently if it isn't. Will be saved again with a debounce or release.
            if typeof content isnt 'string' then return undefined

            @db('ContentBlocks').update
              _id: id
            ,
              $set: content: content
            , (err) =>
              unless err?
                @RMS__animations.flash "#saved-#{id}"

        ]] # End methodFacade

        ['CF__localTemplate', [

          repo__contentBlocks:
            rendered: ->
              for active in @findAll('.active-redactor')
                ($ active).redactor
                  focus: true
                  autoresize: true
                  plugins: ['fullscreen', 'fontfamily']

              if filepicker?
                if !($ '.image-change-button:visible').length
                  filepicker.constructWidget document.getElementById('repo__contentBlocks__uploadFile')

            events:
              'change #repo__contentBlocks__uploadFile': (e) ->
                @db('ContentBlocks').insert
                  type: 'file'
                  repo: Session.get('xCurrentRepo')
                  content: e.fpfiles
                  locked: false
                  createdAt: new Date()
                @saveAndReleaseBlocks()
                Deps.flush()

              'click .repo__contentBlocks__sort': (e) ->
                e.preventDefault()
                e.stopImmediatePropagation()
                @set 'blockSort', ($ e.target).data('type')

              'click .forfeit-block': (e) ->
                e.preventDefault()
                @saveAndReleaseBlocks()
                @db('ContentBlocks').update
                  _id: @_id
                ,
                  $set: locked: false
                Deps.flush()

              'click .delete-block': (e) ->
                e.preventDefault()
                confMessage = if @type is 'file' then "Delete this file set?" else "Delete this content block?"
                if confirm confMessage
                  @db('ContentBlocks').remove _id: @_id

              'click .move-block-up': (e, t) ->
                e.preventDefault()
                e.stopImmediatePropagation()
                x = @position.x
                @db('ContentBlocks').update @_id, $inc: 'position.x': 1
                Deps.flush()

              'click .move-block-down': (e, t) ->
                e.preventDefault()
                e.stopImmediatePropagation()
                x = @position.x
                @db('ContentBlocks').update @_id, $inc: 'position.x': -1
                Deps.flush()

              'click .repo__contentBlocks__createBtn': (e) ->
                e.preventDefault()
                type = ($ e.target).data('type')
                @db('ContentBlocks').insert
                  type: type
                  repo: Session.get('xCurrentRepo')
                  content: "Add some text..."
                  locked: true
                  createdAt: new Date()
                  createdBy: Meteor.userId()
                  position:
                    x: @db('ContentBlocks').find(repo: Session.get('xCurrentRepo')).count() + 1
                @saveAndReleaseBlocks()
                Deps.flush()

              'keyup .click-redactor': _.debounce (e) ->

                 # Autosave
                 if e.type is 'keyup' and e.which != 27
                   @saveBlock @_id

              , 3000

              'click .click-redactor': (e) ->
                if @type is 'file' then return

                # Don't let anyone edit a locked block
                if @locked is true then return false

                # Only allow editing one block at a time
                if !($ e.currentTarget).find('.active-redactor').length
                  e.preventDefault()
                  @saveAndReleaseBlocks @_id
                  @db('ContentBlocks').update
                    _id: @_id
                  ,
                    # Updating to locked makes it ours, because we have the lastUpdatedBy
                    # See lib/handlebars
                    $set:
                      locked: true
                      lastUpdatedBy: Meteor.userId()
                  Deps.flush()

            helpers:
              contentBlocks: ->
                sort = {}
                if @get('blockSort') is 'manual'
                  sort = {'position.x': -1}
                else if @get('blockSort') is 'dateCreated'
                  sort = {createdAt: -1}

                @db('ContentBlocks').find
                  repo: Session.get('xCurrentRepo')
                ,
                  sort: sort
              manualSelected: ->
                if @get('blockSort') is 'manual'
                  return 'selected'
              dateCreatedSelected: ->
                if @get('blockSort') is 'dateCreated'
                  return 'selected'

        ]] # End CF__localTemplate

```
