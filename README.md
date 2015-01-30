Amethyst components (subjects) for Meteor
-----------------------------------------

Taken from an old private repository of mine, last updated *Feb 26, 2014!*

From the pre-Blaze era, some of these probably won't work.

Example
-------

```coffeescript

observer = null # Watch content blocks for new ones

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