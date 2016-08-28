import Ember from 'ember';

export default Ember.Mixin.create({
  actions: {
    setup(editor) {
      let token = '';

      editor.onTextInput({
        match: /(\*|_)(\S+)\1 /,
        run(editor, matches) {
          let [, , matched] = matches;
          let { range } = editor;
          // extend the range backward to cover the text + the 2 "*" + 1 " "
          range = range.extend(-1 * (matched.length + 2 + 1));

          editor.run(postEditor => {
            const marker = 'em';
            let position = postEditor.deleteRange(range);
            let em = postEditor.builder.createMarkup(marker);
            let nextPosition = postEditor.insertTextWithMarkup(position, matched, [em]);
            requestAnimationFrame(() => { editor.toggleMarkup(marker) });
            // postEditor.insertTextWithMarkup(nextPosition, ' ', []); // insert the un-marked-up space
          });
        }
      });

      editor.willDelete((range, direction, unit) => {
        let { builder, cursor } = editor;

        editor.run(postEditor => {
          let { tail: { section } } = range;
          let { markers: { tail: { markups: markups, text } } } = section;

          if (markups.length === 1) {
            let [ markup ] = markups;

            if (direction === -1 && range.isCollapsed && markup.tagName === 'em') {
              range = range.extend(-1 * (text.length));
              token = text;
            }
          }
        })
      });

      editor.didDelete((range, direction, unit) => {
        editor.run(postEditor => {
          let { tail: { section } } = range;
          let { markers: { tail: { markups: markups} } } = section;

          if (token) {
            let [ markup ] = markups;
            // deleted one unit, so move forward one unit and shink the range by 1 unit
            range = range.move(-1).extend(-1);
            let position = postEditor.deleteRange(range);
            postEditor.setRange(position);
            postEditor.insertTextWithMarkup(position, `*${token}*`, []);
            // reset token
            token = '';
          }
        })
      });
    },
  }
});
