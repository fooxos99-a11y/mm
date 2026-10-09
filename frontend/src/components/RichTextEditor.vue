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
          aria-label="اختيار الخط"
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
          aria-label="عريض"
          title="عريض"
        />
        <AppRawButton
          class="ql-italic"
          aria-label="مائل"
          title="مائل"
        />
        <AppRawButton
          class="ql-underline"
          aria-label="تسطير"
          title="تسطير"
        />
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-list"
          value="ordered"
          aria-label="قائمة مرقمة"
          title="قائمة مرقمة"
        />
        <AppRawButton
          class="ql-list"
          value="bullet"
          aria-label="قائمة نقطية"
          title="قائمة نقطية"
        />
        <AppRawButton
          class="ql-blockquote"
          aria-label="اقتباس"
          title="اقتباس"
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
          aria-label="تقليل المسافة البادئة"
          title="تقليل المسافة البادئة"
        />
        <AppRawButton
          class="ql-indent"
          value="+1"
          aria-label="زيادة المسافة البادئة"
          title="زيادة المسافة البادئة"
        />
        <AppRawButton
          class="ql-link"
          aria-label="إدراج رابط"
          title="إدراج رابط"
        />
        <AppRawButton
          v-if="!lockImages"
          class="ql-image"
          aria-label="إدراج صورة"
          title="إدراج صورة"
        />
      </span>
      <span class="ql-formats">
        <AppRawButton
          class="ql-clean"
          aria-label="إزالة التنسيق"
          title="إزالة التنسيق"
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
          aria-label="تغيير حجم الصورة"
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
