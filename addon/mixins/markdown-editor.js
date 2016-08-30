import Ember from 'ember';

function extractMarkupsAndText(range) {
  let { head, tail, tail: { section, offset } } = range;
  let marker = tail ? tail.marker : head.marker;
  let markups = [];
  let text = '';

  if (marker) {
    markups = marker.markups;
    text = marker.text;
  }
  // let { markers: {
  //   tail: { markups: markups, text },
  //   head: { markups: headMarkups, text: headText }
  // } } = section;

  return [markups, text, tail.isTail(), marker && offset === marker.length];
}

class Strategy {
  constructor(tagName, editor) {
    this.tagName = tagName;
    this.callbacks = this._createStrategy(tagName, editor);
  }

  _createStrategy(tagName, editor) {
    let token = '';
    function _run(editor, matches, tagName, symbolLength) {
        let [, , matched] = matches;
        let { range } = editor;
        range = range.extend(-1 * (matched.length + symbolLength));

        editor.run(postEditor => {
          let position = postEditor.deleteRange(range);
          let markup = postEditor.builder.createMarkup(tagName);
          let nextPosition = postEditor.insertTextWithMarkup(position, matched, [markup]);
          requestAnimationFrame(() => { editor.toggleMarkup(tagName) });
        });
    }

    function _willDeleteCallback(range, direction, tagName) {
      editor.run(postEditor => {
        let [markups, text, isTail, isTailOfMarker] = extractMarkupsAndText(range);

        if (markups.length === 1) {
          let [markup] = markups;

          if ((isTail || isTailOfMarker) && markup.tagName === tagName && direction === -1 && range.isCollapsed) {
            token = text;
          }
        }
      });
    }

    function _didDeleteCallback(range, markdownSyntax) {
      editor.run(postEditor => {
        let [markups] = extractMarkupsAndText(range);

        if (token) {
          let [markup] = markups;
          // deleted one unit, so move forward one unit and shink the range by 1 unit
          let extendLength = token.length > 1 ? token.length - 1 : 0;
          range = range.move(-1).extend(-1 * extendLength);
          let position = postEditor.deleteRange(range);
          postEditor.setRange(position);
          postEditor.insertTextWithMarkup(position, markdownSyntax(token), []);
          // reset token
          token = '';
        }
      });
    }

    const strategies = {
      em() {
        const tagName = 'em';
        const markdownSyntax = (t) => `*${t}*`;
        return {
          onTextInputCallback: {
            match: /(\*|_)(\S+)\1 /,
            // extend the range backward to cover the text + the 2 "*" + 1 " "
            run: (editor, matches) => _run(editor, matches, tagName, 2 + 1)
          },
          willDeleteCallback: (range, direction) => _willDeleteCallback(range, direction, tagName),
          didDeleteCallback: (range) => _didDeleteCallback(range, markdownSyntax)
        };
      },

      strong() {
        const tagName = 'strong';
        const markdownSyntax = (t) => `**${token}**`;
        return {
          onTextInputCallback: {
            match: /(\*\*|__)(\S+)\1 /,
            // extend the range backward to cover the text + the 4 "*" + 1 " "
            run: (editor, matches) => _run(editor, matches, tagName, 4 + 1)
          },
          willDeleteCallback: (range, direction) => _willDeleteCallback(range, direction, tagName),
          didDeleteCallback: (range) => _didDeleteCallback(range, markdownSyntax)
        };
      },

      error() {
        throw new Error(`Unable to find ${tagName} strategy`);
      }
    };

    let strategy = strategies[tagName] || strategies.error;
    return strategy();
  }
}

export default Ember.Mixin.create({
  actions: {
    setup(editor) {
      let tagNames = ['strong', 'em'];

      tagNames
        .map(tag => (new Strategy(tag, editor)) )
        .map(strategy => strategy.callbacks)
        .forEach(callbacks => {
          const {
            onTextInputCallback, willDeleteCallback, didDeleteCallback
          } = callbacks;
          editor.onTextInput(onTextInputCallback);
          editor.willDelete(willDeleteCallback);
          editor.didDelete(didDeleteCallback);
        });
    }
  }
});
