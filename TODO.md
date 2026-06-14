# TODO

## Cloudinary onboarding + remove GridFS

- [x] Step 1: Add Cloudinary SDK dependency to `Chat-App-Backend/package.json`.
- [x] Step 2: Create `Chat-App-Backend/config/cloudinary.js` to configure Cloudinary client.
- [x] Step 3: Replace GridFS upload controller logic in `controllers/imageController.js` with Cloudinary uploader, returning secure URL + metadata.
- [x] Step 4: Replace GridFS routes/middleware in `routes/imageRoutes.js` (use multer memory storage instead of GridFS storage).
- [x] Step 5: Remove GridFS module usage by deleting `config/gridfs.js` and removing GridFS-related dependencies from `package.json`.
- [ ] Step 6: Run backend and verify image endpoints work: upload, list, get-by-id, delete.

