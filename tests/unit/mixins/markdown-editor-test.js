import Ember from 'ember';
import MarkdownEditorMixin from 'ember-mobiledoc-md/mixins/markdown-editor';
import { module, test } from 'qunit';

module('Unit | Mixin | markdown editor');

// Replace this with your real tests.
test('it works', function(assert) {
  let MarkdownEditorObject = Ember.Object.extend(MarkdownEditorMixin);
  let subject = MarkdownEditorObject.create();
  assert.ok(subject);
});
