import { MIN_IMAGE_DIMENSION } from './editorConstants';
import { Quill } from './editorRuntime';

export default {
    setSelectedImage(imageElement) {
      if (this.lockImages) {
        this.clearSelectedImage();
        return;
      }

      if (this.selectedImage && this.selectedImage !== imageElement) {
        this.selectedImage.classList.remove('ql-rich-image--selected');
      }

      this.prepareImageElement(imageElement);
      this.selectedImage = imageElement;
      this.selectedImage.classList.add('ql-rich-image--selected');
      this.updateSelectedImageFrame();
    },
    clearSelectedImage() {
      if (this.selectedImage) {
        this.selectedImage.classList.remove('ql-rich-image--selected');
      }

      this.selectedImage = null;
      this.selectedImageFrame = null;
      this.imageInteraction = null;
    },
    prepareImageElement(imageElement) {
      if (!imageElement) {
        return;
      }

      const editorRoot = this.editor?.root || null;
      const editorWidth = editorRoot?.clientWidth || imageElement.clientWidth || 480;
      const imageRect = imageElement.getBoundingClientRect();
      const editorRect = editorRoot?.getBoundingClientRect() || null;
      const storedWidth = Number.parseFloat(imageElement.getAttribute('data-width-px'));
      const inlineWidth = imageElement.style.width && imageElement.style.width !== 'auto'
        ? Number.parseFloat(imageElement.style.width)
        : Number.NaN;
      const inlineHeight = imageElement.style.height && imageElement.style.height !== 'auto'
        ? Number.parseFloat(imageElement.style.height)
        : Number.NaN;
      const storedHeight = Number.parseFloat(imageElement.getAttribute('data-height-px'));
      const storedX = Number.parseFloat(imageElement.getAttribute('data-x'));
      const storedY = Number.parseFloat(imageElement.getAttribute('data-y'));
      const inlineLeft = imageElement.style.left
        ? Number.parseFloat(imageElement.style.left)
        : Number.NaN;
      const inlineTop = imageElement.style.top
        ? Number.parseFloat(imageElement.style.top)
        : Number.NaN;
      const hasStoredX = imageElement.hasAttribute('data-x') && Number.isFinite(storedX);
      const hasStoredY = imageElement.hasAttribute('data-y') && Number.isFinite(storedY);
      const fallbackWidth = Math.round(Math.min(editorWidth * 0.6, 420));
      const measuredWidth = Math.round(imageRect.width || imageElement.clientWidth || fallbackWidth);
      const resolvedWidth = Number.isFinite(storedWidth)
        ? storedWidth
        : (Number.isFinite(inlineWidth) ? inlineWidth : measuredWidth);
      const naturalRatio = imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0
        ? imageElement.naturalHeight / imageElement.naturalWidth
        : 1;
      const measuredHeight = Math.round(
        imageRect.height
        || (resolvedWidth * naturalRatio)
        || resolvedWidth,
      );
      const resolvedHeight = Number.isFinite(storedHeight)
        ? storedHeight
        : (Number.isFinite(inlineHeight) ? inlineHeight : measuredHeight);
      const fallbackX = editorRect ? Math.round(imageRect.left - editorRect.left) : 0;
      const fallbackY = editorRect ? Math.round(imageRect.top - editorRect.top) : 0;
      const resolvedX = hasStoredX
        ? storedX
        : (Number.isFinite(inlineLeft) ? inlineLeft : Math.max(0, fallbackX));
      const resolvedY = hasStoredY
        ? storedY
        : (Number.isFinite(inlineTop) ? inlineTop : Math.max(0, fallbackY));
      const normalizedMetrics = this.normalizeImageMetrics({
        width: resolvedWidth,
        height: resolvedHeight,
        translateX: resolvedX,
        translateY: resolvedY,
      });

      imageElement.style.position = 'absolute';
      imageElement.style.margin = '0';
      imageElement.style.left = `${normalizedMetrics.translateX}px`;
      imageElement.style.top = `${normalizedMetrics.translateY}px`;
      imageElement.style.transform = 'none';
      imageElement.style.maxWidth = 'none';
      imageElement.style.width = `${normalizedMetrics.width}px`;
      imageElement.style.height = `${normalizedMetrics.height}px`;
      imageElement.setAttribute('data-width-px', String(normalizedMetrics.width));
      if (Number.isFinite(normalizedMetrics.height)) {
        imageElement.setAttribute('data-height-px', String(normalizedMetrics.height));
      }
      imageElement.setAttribute('data-x', String(normalizedMetrics.translateX));
      imageElement.setAttribute('data-y', String(normalizedMetrics.translateY));
    },
    refreshEditorImages() {
      if (!this.editor?.root) {
        return;
      }

      this.editor.root.querySelectorAll('img').forEach((imageElement) => {
        this.prepareImageElement(imageElement);
      });
    },
    persistImageMetrics(imageElement = this.selectedImage) {
      if (!this.editor || !imageElement) {
        return;
      }

      const imageBlot = Quill.find(imageElement, true);

      if (!imageBlot || typeof imageBlot.format !== 'function') {
        return;
      }

      const metrics = this.readSelectedImageMetrics(imageElement);

      imageBlot.format('data-width-px', String(metrics.width));
      imageBlot.format('data-height-px', String(metrics.height));
      imageBlot.format('data-x', String(metrics.translateX));
      imageBlot.format('data-y', String(metrics.translateY));
    },
    syncImageElementMetrics(imageElement, metrics) {
      if (!imageElement || !metrics) {
        return;
      }

      imageElement.style.position = 'absolute';
      imageElement.style.margin = '0';
      imageElement.style.left = `${metrics.translateX}px`;
      imageElement.style.top = `${metrics.translateY}px`;
      imageElement.style.width = `${metrics.width}px`;
      imageElement.style.height = `${metrics.height}px`;
      imageElement.style.transform = 'none';
      imageElement.setAttribute('data-width-px', String(metrics.width));
      imageElement.setAttribute('data-height-px', String(metrics.height));
      imageElement.setAttribute('data-x', String(metrics.translateX));
      imageElement.setAttribute('data-y', String(metrics.translateY));
    },
    resolveLiveImageElement(imageIndex, previousImage = this.selectedImage, forcedMetrics = null) {
      if (!this.editor?.root || !previousImage) {
        return null;
      }

      const previousSrc = previousImage.getAttribute('src') || '';
      const resolvedMetrics = forcedMetrics || this.readSelectedImageMetrics(previousImage);
      const previousWidth = resolvedMetrics.width || 0;
      const previousHeight = resolvedMetrics.height || 0;
      const previousX = resolvedMetrics.translateX || 0;
      const previousY = resolvedMetrics.translateY || 0;
      const currentEditor = this.editor;

      const tryResolveLeafImage = (index) => {
        if (!Number.isFinite(index) || index < 0) {
          return null;
        }

        const [leaf] = currentEditor.getLeaf(index);

        return leaf?.domNode?.tagName === 'IMG' ? leaf.domNode : null;
      };

      return tryResolveLeafImage(imageIndex)
        || tryResolveLeafImage(imageIndex - 1)
        || Array.from(currentEditor.root.querySelectorAll('img')).find((imageNode) => {
          if (previousSrc && imageNode.getAttribute('src') !== previousSrc) {
            return false;
          }

          const width = Number.parseFloat(imageNode.getAttribute('data-width-px')) || 0;
          const height = Number.parseFloat(imageNode.getAttribute('data-height-px'))
            || (imageNode.style.height && imageNode.style.height !== 'auto' ? Number.parseFloat(imageNode.style.height) : 0)
            || imageNode.getBoundingClientRect().height
            || 0;
          const translateX = Number.parseFloat(imageNode.getAttribute('data-x')) || 0;
          const translateY = Number.parseFloat(imageNode.getAttribute('data-y')) || 0;

          return Math.abs(width - previousWidth) <= 8
            && Math.abs(height - previousHeight) <= 8
            && Math.abs(translateX - previousX) <= 8
            && Math.abs(translateY - previousY) <= 8;
        })
        || Array.from(currentEditor.root.querySelectorAll('img')).find((imageNode) => (
          !previousSrc || imageNode.getAttribute('src') === previousSrc
        ))
        || null;
    },
    ensureSelectedImageIsLive(imageIndex = null) {
      if (this.selectedImage && document.body.contains(this.selectedImage)) {
        return true;
      }

      const preservedMetrics = this.selectedImage
        ? this.readSelectedImageMetrics(this.selectedImage)
        : null;

      const liveImage = this.resolveLiveImageElement(
        imageIndex,
        this.selectedImage,
        preservedMetrics,
      );

      if (!liveImage) {
        return false;
      }

      this.setSelectedImage(liveImage);

      if (preservedMetrics) {
        this.syncImageElementMetrics(liveImage, preservedMetrics);
        this.updateSelectedImageFrame();
      }

      return true;
    },
    rebindSelectedImage(imageIndex, previousImage = this.selectedImage, forcedMetrics = null) {
      if (!this.editor || !previousImage) {
        this.clearSelectedImage();
        return;
      }

      const resolvedMetrics = forcedMetrics || this.readSelectedImageMetrics(previousImage);
      const previousWidth = resolvedMetrics.width || 0;
      const previousHeight = resolvedMetrics.height || 0;
      const previousX = resolvedMetrics.translateX || 0;
      const previousY = resolvedMetrics.translateY || 0;

      this.$nextTick(() => {
        window.requestAnimationFrame(() => {
        if (!this.editor?.root) {
          this.clearSelectedImage();
          return;
        }

        const liveImage = this.resolveLiveImageElement(imageIndex, previousImage, resolvedMetrics);

        if (liveImage) {
          this.setSelectedImage(liveImage);

          const liveMetrics = this.readSelectedImageMetrics(liveImage);
          const shouldSyncMetrics = Math.abs(liveMetrics.width - previousWidth) > 0.5
            || Math.abs(liveMetrics.height - previousHeight) > 0.5
            || Math.abs(liveMetrics.translateX - previousX) > 0.5
            || Math.abs(liveMetrics.translateY - previousY) > 0.5;

          if (shouldSyncMetrics) {
            this.syncImageElementMetrics(liveImage, {
              width: previousWidth || liveMetrics.width,
              height: previousHeight || liveMetrics.height,
              translateX: previousX,
              translateY: previousY,
            });
            this.updateSelectedImageFrame();
          }

          return;
        }

        this.clearSelectedImage();
        });
      });
    },
    readSelectedImageMetrics(imageElement = this.selectedImage) {
      if (!imageElement) {
        return {
          width: 0,
          height: 0,
          translateX: 0,
          translateY: 0,
        };
      }

      return {
        width: Number.parseFloat(imageElement.getAttribute('data-width-px')) || imageElement.getBoundingClientRect().width || 0,
        height: Number.parseFloat(imageElement.getAttribute('data-height-px'))
          || (imageElement.style.height && imageElement.style.height !== 'auto' ? Number.parseFloat(imageElement.style.height) : 0)
          || imageElement.getBoundingClientRect().height
          || 0,
        translateX: Number.parseFloat(imageElement.getAttribute('data-x')) || 0,
        translateY: Number.parseFloat(imageElement.getAttribute('data-y')) || 0,
      };
    },
    normalizeImageMetrics(metrics = {}) {
      const currentMetrics = this.readSelectedImageMetrics();
      const editorWidth = this.editor?.root?.clientWidth || 0;
      const maxWidth = Math.max(MIN_IMAGE_DIMENSION, Math.round((editorWidth || metrics.width || currentMetrics.width || MIN_IMAGE_DIMENSION) - 8));
      let nextWidth = Math.max(
        MIN_IMAGE_DIMENSION,
        Math.round(Number.isFinite(metrics.width) ? metrics.width : currentMetrics.width),
      );
      let nextHeight = Math.max(
        MIN_IMAGE_DIMENSION,
        Math.round(Number.isFinite(metrics.height) ? metrics.height : currentMetrics.height),
      );

      if (nextWidth > maxWidth) {
        const scale = maxWidth / nextWidth;
        nextWidth = maxWidth;
        nextHeight = Math.max(MIN_IMAGE_DIMENSION, Math.round(nextHeight * scale));
      }

      const maxTranslateX = Math.max(0, (editorWidth || nextWidth) - nextWidth);
      const rawTranslateX = Math.round(
        Number.isFinite(metrics.translateX) ? metrics.translateX : currentMetrics.translateX,
      );
      const rawTranslateY = Math.round(
        Number.isFinite(metrics.translateY) ? metrics.translateY : currentMetrics.translateY,
      );

      return {
        width: nextWidth,
        height: nextHeight,
        translateX: Math.max(0, Math.min(rawTranslateX, maxTranslateX)),
        translateY: Math.max(0, rawTranslateY),
      };
    },
    updateSelectedImageFrame() {
      if (!this.selectedImage || !this.$refs.surface) {
        this.selectedImageFrame = null;
        return;
      }

      if (!document.body.contains(this.selectedImage) && !this.ensureSelectedImageIsLive(this.imageInteraction?.imageIndex)) {
        this.selectedImageFrame = null;
        return;
      }

      const imageRect = this.selectedImage.getBoundingClientRect();
      const surfaceRect = this.$refs.surface.getBoundingClientRect();

      this.selectedImageFrame = {
        top: imageRect.top - surfaceRect.top,
        left: imageRect.left - surfaceRect.left,
        width: imageRect.width,
        height: imageRect.height,
      };
    },
};
