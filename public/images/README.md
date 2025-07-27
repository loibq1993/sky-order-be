# Images Directory

This directory contains all menu item images for the Sky Order application.

## Structure

```
public/
└── images/
    ├── com-rang-dua-bo.jpg
    ├── com-ga.jpg
    ├── pho-bo.jpg
    ├── muc-kho-nuong.jpg
    └── ... (other menu images)
```

## Image URLs

Images are served from: `http://localhost:4500/images/filename.jpg`

## Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

## Recommended Specifications

- **Size**: 800x600 pixels (4:3 ratio)
- **Format**: JPEG for photos, PNG for graphics with transparency
- **File Size**: Under 500KB per image
- **Naming**: Use kebab-case (e.g., `com-rang-dua-bo.jpg`)

## Adding New Images

1. Place your image file in this directory
2. Use descriptive, kebab-case naming
3. Update the menu item's `image` field in the database
4. The image will be available at `/images/filename.jpg`

## Example

For a menu item with image path `/images/muc-kho-nuong.jpg`:
- File location: `public/images/muc-kho-nuong.jpg`
- URL: `http://localhost:4500/images/muc-kho-nuong.jpg` 