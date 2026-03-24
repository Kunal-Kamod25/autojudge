const router = require('express').Router();
const submissionCtrl = require('../controllers/submissionController');
const executionCtrl = require('../controllers/executionController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.post('/extract-zip', upload.single('file'), executionCtrl.extractZip);
router.post('/run', upload.single('file'), executionCtrl.runCustom);
router.post('/', upload.single('file'), submissionCtrl.submit);
router.get('/me', submissionCtrl.getMySubmissions);
router.get('/:id', submissionCtrl.getSubmission);
router.get('/:id/pdf', submissionCtrl.downloadPDF);

module.exports = router;
