const express = require('express');
const router = express.Router();
const { createPetProfile, getPetProfile, updatePetProfile, deletePetProfile } = require('../controllers/petProfileController');
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     PetProfile:
 *       type: object
 *       required:
 *         - petType
 *         - name
 *         - breed
 *         - sex
 *         - dateOfBirth
 *         - color
 *         - size
 *         - weight
 *       properties:
 *         isHavePet:
 *           type: boolean
 *           default: false
 *         petType:
 *           type: string
 *           enum: [cat, dog]
 *         profilePic:
 *           type: string
 *         name:
 *           type: string
 *         breed:
 *           type: string
 *         sex:
 *           type: string
 *           enum: [male, female]
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         bio:
 *           type: string
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 5
 *         color:
 *           type: string
 *         size:
 *           type: string
 *           enum: [small, medium, large]
 *         weight:
 *           type: number
 *         marks:
 *           type: string
 *         microchipNumber:
 *           type: string
 *         tagId:
 *           type: string
 *         lostStatus:
 *           type: boolean
 *           default: false
 *         vaccinationStatus:
 *           type: boolean
 *           default: false
 *         vetName:
 *           type: string
 *         vetContactNumber:
 *           type: string
 *         personalityTraits:
 *           type: array
 *           items:
 *             type: string
 *         allergies:
 *           type: array
 *           items:
 *             type: string
 *         specialNeeds:
 *           type: string
 *         feedingInstructions:
 *           type: string
 *         dailyRoutine:
 *           type: string
 */

/**
 * @swagger
 * /api/pet-profile:
 *   post:
 *     summary: Create a new pet profile
 *     tags: [Pet Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PetProfile'
 *     responses:
 *       201:
 *         description: Pet profile created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */
router.post('/', auth, createPetProfile);

/**
 * @swagger
 * /api/pet-profile:
 *   get:
 *     summary: Get user's pet profile
 *     tags: [Pet Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pet profile retrieved successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Pet profile not found
 */
router.get('/', auth, getPetProfile);

/**
 * @swagger
 * /api/pet-profile:
 *   patch:
 *     summary: Update pet profile
 *     tags: [Pet Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PetProfile'
 *     responses:
 *       200:
 *         description: Pet profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Pet profile not found
 */
router.patch('/', auth, updatePetProfile);

/**
 * @swagger
 * /api/pet-profile:
 *   delete:
 *     summary: Delete pet profile
 *     tags: [Pet Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pet profile deleted successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Pet profile not found
 */
router.delete('/', auth, deletePetProfile);

module.exports = router; 