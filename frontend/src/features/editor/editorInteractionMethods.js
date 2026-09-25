import { MIN_IMAGE_DIMENSION } from './editorConstants';
import { Quill } from './editorRuntime';


export default {
    applyImageMetrics({ width, height, translateX, translateY }, options = {}) {
      if (!this.selectedImage) {
        return;
      }

      const {
        syncEditorModel = true,
        emitValue = syncEditorModel,
      } = options;

      const normalizedMetrics = this.normalizeImageMetrics({
        width,
        height,
        translateX,
        translateY,
      });

      this.syncImageElementMetrics(this.selectedImage, {
        width: normalizedMetrics.width,
        height: normalizedMetrics.height,
        translateX: normalizedMetrics.translateX,
        translateY: normalizedMetrics.translateY,
      });

      if (syncEditorModel) {
        this.persistImageMetrics(this.selectedImage);
      }

      this.updateSelectedImageFrame();

      if (emitValue) {
        this.emitEditorValue();
      }
    },
    captureImagePointer(pointerTarget, pointerId) {
      if (!pointerTarget || typeof pointerTarget.setPointerCapture !== 'function' || !Number.isInteger(pointerId)) {
        return;
      }

      try {
        pointerTarget.setPointerCapture(pointerId);
      } catch (error) {
        // Ignore synthetic or unsupported pointer capture failures.
      }
    },
    releaseImagePointer(pointerTarget, pointerId) {
      if (!pointerTarget || typeof pointerTarget.releasePointerCapture !== 'function' || !Number.isInteger(pointerId)) {
        return;
      }

      try {
        pointerTarget.releasePointerCapture(pointerId);
      } catch (error) {
        // Ignore synthetic or already-released pointer capture failures.
      }
    },
    startImageDrag(event) {
      if (this.lockImages || !this.selectedImage) {
        return;
      }

      const moveListener = this.imageInteractionMoveListener || ((moveEvent) => this.handleImageInteractionMove(moveEvent));
      const stopListener = this.imageInteractionStopListener || (() => this.stopImageInteraction());
      const pointerTarget = event.currentTarget || event.target || null;
      const imageBlot = this.editor ? Quill.find(this.selectedImage, true) : null;
      const imageIndex = imageBlot && this.editor ? this.editor.getIndex(imageBlot) : -1;
      this.captureImagePointer(pointerTarget, event.pointerId);

      const { width, height, translateX, translateY } = this.readSelectedImageMetrics();

      this.imageInteraction = {
        mode: 'move',
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startWidth: width,
        startHeight: height,
        startTranslateX: translateX,
        startTranslateY: translateY,
        handle: '',
        imageIndex,
        pointerId: Number.isInteger(event.pointerId) ? event.pointerId : null,
        pointerTarget,
      };
      this.pendingImageInteractionPoint = null;

      window.addEventListener('pointermove', moveListener);
      window.addEventListener('pointerup', stopListener);
      window.addEventListener('pointercancel', stopListener);
    },
    startImageResize(handle, event) {
      if (this.lockImages || !this.selectedImage) {
        return;
      }

      const moveListener = this.imageInteractionMoveListener || ((moveEvent) => this.handleImageInteractionMove(moveEvent));
      const stopListener = this.imageInteractionStopListener || (() => this.stopImageInteraction());
      const pointerTarget = event.currentTarget || event.target || null;
      const imageBlot = this.editor ? Quill.find(this.selectedImage, true) : null;
      const imageIndex = imageBlot && this.editor ? this.editor.getIndex(imageBlot) : -1;
      this.captureImagePointer(pointerTarget, event.pointerId);

      const { width, height, translateX, translateY } = this.readSelectedImageMetrics();
      const safeHeight = Math.max(height || 0, 1);

      this.imageInteraction = {
        mode: 'resize',
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startWidth: width,
        startHeight: safeHeight,
        startTranslateX: translateX,
        startTranslateY: translateY,
        aspectRatio: width > 0 ? width / safeHeight : 1,
        handle,
        imageIndex,
        pointerId: Number.isInteger(event.pointerId) ? event.pointerId : null,
        pointerTarget,
      };
      this.pendingImageInteractionPoint = null;

      window.addEventListener('pointermove', moveListener);
      window.addEventListener('pointerup', stopListener);
      window.addEventListener('pointercancel', stopListener);
    },
    applyPendingImageInteraction() {
      if (!this.selectedImage || !this.imageInteraction) {
        return;
      }

      if (!this.ensureSelectedImageIsLive(this.imageInteraction.imageIndex)) {
        return;
      }

      const point = this.pendingImageInteractionPoint;

      if (!point) {
        return;
      }

      const deltaX = point.clientX - this.imageInteraction.startPointerX;
      const deltaY = point.clientY - this.imageInteraction.startPointerY;

      if (this.imageInteraction.mode === 'move') {
        this.applyImageMetrics({
          width: this.imageInteraction.startWidth,
          height: this.imageInteraction.startHeight,
          translateX: this.imageInteraction.startTranslateX + deltaX,
          translateY: this.imageInteraction.startTranslateY + deltaY,
        }, { syncEditorModel: false, emitValue: false });
        this.pendingImageInteractionPoint = null;
        return;
      }

      const handle = this.imageInteraction.handle || 'se';
      const widthDelta = handle.includes('w') ? -deltaX : deltaX;
      const heightDelta = handle.includes('n') ? -deltaY : deltaY;
      const startWidth = Math.max(this.imageInteraction.startWidth || 0, MIN_IMAGE_DIMENSION);
      const startHeight = Math.max(this.imageInteraction.startHeight || 0, 1);
      const aspectRatio = this.imageInteraction.aspectRatio || (startWidth / startHeight) || 1;
      const widthScale = (startWidth + widthDelta) / startWidth;
      const heightScale = (startHeight + heightDelta) / startHeight;
      const preferredScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
      const minimumScale = Math.max(
        MIN_IMAGE_DIMENSION / startWidth,
        MIN_IMAGE_DIMENSION / startHeight,
      );
      const nextScale = Math.max(minimumScale, preferredScale);
      const nextWidth = startWidth * nextScale;
      const nextHeight = nextWidth / aspectRatio;
      const nextTranslateX = handle.includes('w')
        ? this.imageInteraction.startTranslateX + (startWidth - nextWidth)
        : this.imageInteraction.startTranslateX;
      const nextTranslateY = handle.includes('n')
        ? this.imageInteraction.startTranslateY + (startHeight - nextHeight)
        : this.imageInteraction.startTranslateY;

      this.applyImageMetrics({
        width: nextWidth,
        height: nextHeight,
        translateX: nextTranslateX,
        translateY: nextTranslateY,
      }, { syncEditorModel: false, emitValue: false });
      this.pendingImageInteractionPoint = null;
    },
    scheduleImageInteractionUpdate() {
      if (this.imageInteractionFrameRequest) {
        return;
      }

      this.imageInteractionFrameRequest = window.requestAnimationFrame(() => {
        this.imageInteractionFrameRequest = null;
        this.applyPendingImageInteraction();
      });
    },
    handleImageInteractionMove(event) {
      if (!this.selectedImage || !this.imageInteraction) {
        return;
      }

      this.pendingImageInteractionPoint = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      this.applyPendingImageInteraction();
    },
    stopImageInteraction() {
      const moveListener = this.imageInteractionMoveListener || this.handleImageInteractionMove;
      const stopListener = this.imageInteractionStopListener || this.stopImageInteraction;

      window.removeEventListener('pointermove', moveListener);
      window.removeEventListener('pointerup', stopListener);
      window.removeEventListener('pointercancel', stopListener);
      this.releaseImagePointer(this.imageInteraction?.pointerTarget, this.imageInteraction?.pointerId);

      if (this.imageInteractionFrameRequest) {
        window.cancelAnimationFrame(this.imageInteractionFrameRequest);
        this.imageInteractionFrameRequest = null;
      }

      this.applyPendingImageInteraction();

      if (this.selectedImage) {
        const selectedImage = this.selectedImage;
        const finalMetrics = this.readSelectedImageMetrics(selectedImage);
        const imageBlot = this.editor ? Quill.find(this.selectedImage, true) : null;
        const imageIndex = imageBlot && this.editor
          ? this.editor.getIndex(imageBlot)
          : (this.imageInteraction?.imageIndex ?? -1);
        const liveImage = this.resolveLiveImageElement(imageIndex, selectedImage, finalMetrics);

        if (liveImage) {
          this.syncImageElementMetrics(liveImage, finalMetrics);
        }

        this.persistImageMetrics(selectedImage);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (!this.editor) {
              return;
            }

            this.emitEditorValue();
            this.rebindSelectedImage(imageIndex, selectedImage, finalMetrics);
          });
        });
      }

      this.pendingImageInteractionPoint = null;
      this.imageInteraction = null;
    },
    emitEditorValue() {
      if (!this.editor) {
        return;
      }

      this.$emit('input', this.sanitizeEditorHtml(this.editor.root.innerHTML));
    },
    destroyEditor() {
      if (!this.editor) {
        return;
      }

      this.editor.root.removeEventListener('click', this.handleEditorClick);
      this.editor.root.removeEventListener('pointerdown', this.handleEditorPointerDown);
      this.editor.root.removeEventListener('paste', this.handleEditorPaste);
      this.editor.root.removeEventListener('contextmenu', this.handleTableContextMenu);
      this.$refs.toolbar?.removeEventListener('pointerdown', this.toolbarPointerDownListener, true);
      this.editor.off('text-change', this.handleEditorTextChange);
      this.editor.off('selection-change', this.handleSelectionChange);
      window.removeEventListener('resize', this.handleViewportChange);
      window.removeEventListener('scroll', this.handleViewportChange, true);
      window.removeEventListener('pointerdown', this.handleWindowPointerDown, true);
      this.stopImageInteraction();
      this.hideTableContextMenu();
      this.clearSelectedImage();
      this.imageInteractionMoveListener = null;
      this.imageInteractionStopListener = null;
      this.editor = null;
    },
};
