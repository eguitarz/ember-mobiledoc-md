import Ember from 'ember';

function extractMarkupsAndText(range) {
  let { tail: { section } } = range;
  let { markers: { tail: { markups: markups, text } } } = section;

  return [markups, text];
}

class Strategy {
  constructor(tagName, editor) {
    this.tagName = tagName;
    this.callbacks = this._createStrategy(tagName, editor);
  }

  _createStrategy(tagName, editor) {
    const strategies = {
      em() {
        let token = '';

        return {
          onTextInputCallback: {
            match: /(\*|_)(\S+)\1 /,
            run(editor, matches) {
              let [, , matched] = matches;
              let { range } = editor;
              // extend the range backward to cover the text + the 2 "*" + 1 " "
              range = range.extend(-1 * (matched.length + 2 + 1));

              editor.run(postEditor => {
                const marker = 'em';
                let position = postEditor.deleteRange(range);
                let markup = postEditor.builder.createMarkup(marker);
                let nextPosition = postEditor.insertTextWithMarkup(position, matched, [markup]);
                requestAnimationFrame(() => { editor.toggleMarkup(marker) });
              });
            }
          },
          willDeleteCallback(range, direction, unit) {
            let { builder, cursor } = editor;

            editor.run(postEditor => {
              let [markups, text] = extractMarkupsAndText(range);

              if (markups.length === 1) {
                let [markup] = markups;

                if (direction === -1 && range.isCollapsed && markup.tagName === 'em') {
                  range = range.extend(-1 * (text.length));
                  token = text;
                }
              }
            });
          },
          didDeleteCallback(range, direction, unit) {
            editor.run(postEditor => {
              let [markups] = extractMarkupsAndText(range);

              if (token) {
                let [markup] = markups;
                // deleted one unit, so move forward one unit and shink the range by 1 unit
                let extendLength = token.length > 1 ? token.length - 1 : 0;
                range = range.move(-1).extend(-1 * extendLength);
                let position = postEditor.deleteRange(range);
                postEditor.setRange(position);
                postEditor.insertTextWithMarkup(position, `*${token}*`, []);
                // reset token
                token = '';
              }
            });
          }
        };
      },

      error() {
        throw new Exception(`Unable to find ${tagName} strategy`);
      }
    };

    let strategy = strategies[tagName] || strategies.error;
    return strategy();
  }
}

export default Ember.Mixin.create({
  actions: {
    setup(editor) {
      const { callbacks: {
        onTextInputCallback, willDeleteCallback, didDeleteCallback
      } } = new Strategy('em', editor);
      editor.onTextInput(onTextInputCallback);
      editor.willDelete(willDeleteCallback);
      editor.didDelete(didDeleteCallback);
    }
  }
});
