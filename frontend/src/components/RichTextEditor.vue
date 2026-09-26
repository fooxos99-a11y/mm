<template>
  <div
    class="rich-text-editor"
    :class="{ 'rich-text-editor--disabled': disabled }"
    :style="editorStyle"
  >
    <div
      ref="toolbar"
      class="rich-text-editor__toolbar"
    >
      <span class="ql-formats">
        <AppNativeSelect
          class="ql-font"
          default-value=""
        >
          <option
            selected
            value=""
          >الخط</option>
          <option value="traditional-arabic">العربي التقليدي</option>
          <option value="simplified-arabic">العربي المبسط</option>
          <option value="arabic-typesetting">صف الحروف العربي</option>
          <option value="tahoma">تاهوما</option>
          <option value="arial">آريال</option>
          <option value="segoe-ui">سيغو UI</option>
        </AppNativeSelect>
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-bold"
        />
        <AppRawButton
          class="ql-italic"
        />
        <AppRawButton
          class="ql-underline"
        />
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-list"
          value="ordered"
        />
        <AppRawButton
          class="ql-list"
          value="bullet"
        />
        <AppRawButton
          class="ql-blockquote"
        />
        <AppRawButton
          class="ql-table rich-text-editor__table-trigger"
          value="newtable_3_3"
          title="إدراج جدول 3 × 3"
          aria-label="إدراج جدول 3 × 3"
        >
          <span
            class="rich-text-editor__table-trigger-icon"
            aria-hidden="true"
          >▦</span>
        </AppRawButton>
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-indent"
          value="-1"
        />
        <AppRawButton
          class="ql-indent"
          value="+1"
        />
        <AppRawButton
          class="ql-link"
        />
        <AppRawButton
          v-if="!lockImages"
          class="ql-image"
        />
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-clean"
        />
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-undo"
          title="تراجع (Ctrl+Z)"
          aria-label="تراجع"
        >
          <svg
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              class="ql-stroke"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 8.5A4.5 4.5 0 1 1 4 14"
            />
            <polyline
              class="ql-stroke"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              points="2,6 4,8.5 6.5,6.5"
            />
          </svg>
        </AppRawButton>
      </span>
    </div>

    <input
      :id="`rich-text-editor-image-input-${$.uid}`"
      ref="imageInput"
      class="rich-text-editor__image-input"
      type="file"
      aria-label="إدراج صورة"
      accept="image/png,image/jpeg,image/gif,image/webp"
      @change="handleImageSelection"
    >

    <div
      ref="surface"
      class="rich-text-editor__surface"
      :class="{ 'rich-text-editor__surface--dragging': isDragOver }"
      @dragover.prevent="handleSurfaceDragOver"
      @dragleave="handleSurfaceDragLeave"
      @drop.prevent="handleSurfaceDrop"
    >
      <div
        v-if="isDragOver"
        class="rich-text-editor__drop-hint"
      >
        أفلِت الصورة هنا لإضافتها داخل الصفحة
      </div>
      <div
        v-if="selectedImageFrame"
        class="rich-text-editor__image-frame"
        :style="selectedImageFrameStyle"
        @pointerdown.prevent="handleImageFramePointerDown"
      >
        <AppRawButton
          v-for="handle in imageHandles"
          :key="handle"
          class="rich-text-editor__image-handle"
          :class="`rich-text-editor__image-handle--${handle}`"
          @pointerdown.prevent="startImageResize(handle, $event)"
        />
      </div>
      <div
        v-if="tableContextMenu.visible"
        ref="tableContextMenu"
        class="rich-text-editor__table-menu"
        :style="tableContextMenuStyle"
      >
        <AppRawButton
          v-for="action in tableContextActions"
          :key="action.value"
          class="rich-text-editor__table-menu-item"
          :class="{ 'rich-text-editor__table-menu-item--danger': action.danger }"
          @click="handleTableContextAction(action.value)"
        >
          {{ action.label }}
        </AppRawButton>
      </div>
      <div
        ref="editor"
        class="rich-text-editor__editor"
      />
    </div>
  </div>
</template>

<script src="../features/editor/richTextEditor.js"></script>

<style scoped src="../styles/components/rich-text-editor-toolbar.css"></style>
<style scoped src="../styles/components/rich-text-editor-surface.css"></style>
