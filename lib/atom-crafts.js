'use babel';

import AtomCraftsView from './atom-crafts-view';
import AtomCraftsProject from './atom-crafts-project';
import template from './atom-crafts-default-template';

import { CompositeDisposable } from 'atom';

export default {

  atomCraftsView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.atomCraftsView = new AtomCraftsView(state.atomCraftsViewState);
    this.previewPanel = atom.workspace.addRightPanel({
      item: this.atomCraftsView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-crafts:toggle': () => this.toggle()
    }));

    this.editor = atom.workspace.getActiveTextEditor();

    this.project = new AtomCraftsProject()
    this.setDefaultTemplate();
    this.createEventListeners();
    this.updateDesign();
    this.updateTextEditorMarkers();
    this.updateProjectViews();
  },

  updateDesign() {
    try {
      this.project.design = this.editor.getText();
      this.atomCraftsView.canvas = this.project.canvas;
      this.atomCraftsView.message = null;
    } catch (error) {
      this.atomCraftsView.message = error;
    }
  },

  updateProjectViews() {
    if (this.project.isValid) {
      if (JSON.stringify(this.project.palette) !==
          JSON.stringify(this.cachedPalette)) {
        this.cachedPalette = this.project.palette;
        this.updateTextEditorPalette(this.project.palette);
        this.atomCraftsView.updatePalettePicker(this.project.palette);
      }
      this.atomCraftsView.updateLabels(this.project.rows, this.project.cols);
    }
  },

  updateTextEditorMarkers() {
    this.removeMarkers();
    if (this.project.isValid) {
      this.editor.scan(new RegExp(this.paletteToRegex(this.project.palette), 'g'), object => {
        const marker = this.editor.markBufferRange(object.range, { invalidate: 'inside'});
        this.editor.decorateMarker(marker, {type: 'text', class: `highlight-${object.matchText}`})
      })
    }
  },

  updateTextEditorPalette(palette) {
    // todo: find a better way to do all of this
    const length = Object.keys(palette).length;
    for (var i = 0; i < length; i++) {
      if (document.styleSheets[0].rules[0].selectorText.includes('highlight')) {
        document.styleSheets[0].deleteRule(0);
      }
    }
    for (let color in palette) {
      const rule = `.highlight-${color} { background: ${palette[color].string() }}`
      document.styleSheets[0].insertRule(rule, 0);
    }
  },

  rangeOfProperty(name, terminator) {
    // todo
  },

  paletteToRegex(palette) {
    if (!palette) palette = this.cachedPalette;
    return Object.keys(palette).join('|')
  },

  removeMarkers() {
    const markers = this.editor.findMarkers()
    markers.forEach(marker => {
      marker.destroy();
    })
  },

  setDefaultTemplate() {
    if (!this.editor.getText()) {
      this.editor.setText(JSON.stringify(template, null, 2));
    }
  },

  createEventListeners() {
    this.project.emitter.on('dataDidChange', data => {
      this.editor.setText(JSON.stringify(data, null, 2));
    });

    this.project.emitter.on('didChangeGridPosition', pos => {
      this.atomCraftsView.updateLabelHighlight(pos);
    });

    this.atomCraftsView.emitter.on('didSelectColorName', color => {
      this.project.selectedColorName = color;
    })

    this.atomCraftsView.emitter.on('didSelectPadding', padding => {
      console.log(padding);
      this.project.pad(padding);
    })

    this.editor.onDidStopChanging(() => {
      this.updateDesign();
      this.updateProjectViews();
      this.updateTextEditorMarkers();
    });

    this.editor.onDidChange(() => {
      this.updateTextEditorMarkers();
    });
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomCraftsView.destroy();
    this.project.destroy();
  },

  serialize() {
    return {
      atomCraftsViewState: this.atomCraftsView.serialize()
    };
  },

  toggle() {
    return (
      this.previewPanel.isVisible() ?
      this.previewPanel.hide() :
      this.previewPanel.show()
    );
  }

};
