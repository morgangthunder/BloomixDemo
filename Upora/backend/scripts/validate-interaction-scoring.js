/**
 * Validation Script: Interaction Scoring Audit
 * 
 * This script validates that all interaction types correctly save scores
 * and that scores appear correctly in Engagement Details.
 * 
 * Usage:
 *   node scripts/validate-interaction-scoring.js [userId] [lessonId]
 * 
 * Example:
 *   node scripts/validate-interaction-scoring.js fihivos773@cimario.com a1b2c3d4-e5f6-7890-abcd-ef1234567890
 */

const { Client } = require('pg');
const readline = require('readline');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'upora_db',
  user: process.env.DB_USER || 'upora_user',
  password: process.env.DB_PASSWORD || 'upora_password',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function validateInteractionScoring(userId, lessonId) {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Get user ID from email if needed
    let actualUserId = userId;
    if (userId && userId.includes('@')) {
      console.log(`📧 Looking up user ID for email: ${userId}`);
      const userResult = await client.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        console.error(`❌ User not found: ${userId}`);
        return;
      }
      
      actualUserId = userResult.rows[0].id;
      console.log(`✅ Found user ID: ${actualUserId}\n`);
    }

    // Step 2: Get all interaction types
    console.log('📋 Fetching all interaction types...');
    const interactionTypesResult = await client.query(
      `SELECT id, name, interaction_type_category FROM interaction_types ORDER BY id`
    );
    const interactionTypes = interactionTypesResult.rows;
    console.log(`✅ Found ${interactionTypes.length} interaction types\n`);

    // Step 3: Get user progress for specified lesson (or all lessons)
    let progressQuery = `
      SELECT 
        uip.interaction_type_id,
        uip.lesson_id,
        uip.score,
        uip.completed,
        uip.attempts,
        uip.start_timestamp,
        uip.complete_timestamp,
        it.name as interaction_name,
        it.interaction_type_category,
        l.title as lesson_title
      FROM user_interaction_progress uip
      JOIN interaction_types it ON uip.interaction_type_id = it.id
      LEFT JOIN lessons l ON uip.lesson_id = l.id
      WHERE uip.user_id = $1
    `;
    const queryParams = [actualUserId];
    
    if (lessonId) {
      progressQuery += ` AND uip.lesson_id = $2`;
      queryParams.push(lessonId);
    }
    
    progressQuery += ` ORDER BY uip.interaction_type_id, uip.lesson_id`;

    console.log('📊 Fetching user progress...');
    const progressResult = await client.query(progressQuery, queryParams);
    const progressRecords = progressResult.rows;
    console.log(`✅ Found ${progressRecords.length} progress records\n`);

    // Step 4: Analyze each interaction type
    console.log('🔍 Analyzing interaction types...\n');
    console.log('='.repeat(80));
    
    const analysis = {
      totalTypes: interactionTypes.length,
      typesWithProgress: new Set(),
      typesWithScores: new Set(),
      typesWithoutScores: new Set(),
      issues: [],
    };

    for (const interactionType of interactionTypes) {
      const typeId = interactionType.id;
      const typeName = interactionType.name;
      const category = interactionType.interaction_type_category || 'unknown';
      
      const typeProgress = progressRecords.filter(p => p.interaction_type_id === typeId);
      
      if (typeProgress.length === 0) {
        console.log(`\n📦 ${typeName} (${typeId}) [${category}]`);
        console.log(`   ⚠️  No progress records found for this interaction type`);
        console.log(`   💡 This is normal if the interaction hasn't been used yet`);
        continue;
      }

      analysis.typesWithProgress.add(typeId);
      
      const withScore = typeProgress.filter(p => p.score !== null && p.score !== undefined);
      const withoutScore = typeProgress.filter(p => p.score === null || p.score === undefined);
      const completed = typeProgress.filter(p => p.completed === true);
      
      console.log(`\n📦 ${typeName} (${typeId}) [${category}]`);
      console.log(`   📊 Total attempts: ${typeProgress.length}`);
      console.log(`   ✅ With score: ${withScore.length}`);
      console.log(`   ❌ Without score: ${withoutScore.length}`);
      console.log(`   ✓ Completed: ${completed.length}`);
      
      if (withScore.length > 0) {
        analysis.typesWithScores.add(typeId);
        const scores = withScore.map(p => p.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        console.log(`   📈 Score range: ${minScore.toFixed(2)} - ${maxScore.toFixed(2)} (avg: ${avgScore.toFixed(2)})`);
      }
      
      if (withoutScore.length > 0) {
        analysis.typesWithoutScores.add(typeId);
        console.log(`   ⚠️  ${withoutScore.length} attempt(s) missing score`);
        
        // Check if this interaction type should have scores
        const jsCode = await client.query(
          `SELECT js_code FROM interaction_types WHERE id = $1`,
          [typeId]
        );
        
        if (jsCode.rows.length > 0 && jsCode.rows[0].js_code) {
          const code = jsCode.rows[0].js_code.toLowerCase();
          const hasScoreCalculation = code.includes('score') || code.includes('calculate');
          const hasSaveProgress = code.includes('saveuserprogress') || code.includes('save_user_progress');
          
          if (hasScoreCalculation || hasSaveProgress) {
            analysis.issues.push({
              typeId,
              typeName,
              issue: 'Missing scores for attempts',
              count: withoutScore.length,
              severity: 'high',
              recommendation: 'Check if saveUserProgress is being called with score when interaction completes'
            });
            
            console.log(`   🔴 ISSUE: This interaction appears to calculate scores but some attempts are missing scores`);
            console.log(`   💡 Recommendation: Verify saveUserProgress is called with score when interaction completes`);
          }
        }
      }
      
      // Show lesson breakdown
      const lessons = [...new Set(typeProgress.map(p => ({ id: p.lesson_id, title: p.lesson_title })))];
      if (lessons.length > 0) {
        console.log(`   📚 Used in ${lessons.length} lesson(s):`);
        for (const lesson of lessons) {
          const lessonProgress = typeProgress.filter(p => p.lesson_id === lesson.id);
          const lessonWithScore = lessonProgress.filter(p => p.score !== null && p.score !== undefined);
          const lessonAvg = lessonWithScore.length > 0
            ? (lessonWithScore.reduce((sum, p) => sum + p.score, 0) / lessonWithScore.length).toFixed(2)
            : 'N/A';
          console.log(`      - ${lesson.title || lesson.id}: ${lessonProgress.length} attempt(s), avg score: ${lessonAvg}`);
        }
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY\n');
    console.log(`Total interaction types: ${analysis.totalTypes}`);
    console.log(`Types with progress: ${analysis.typesWithProgress.size}`);
    console.log(`Types with scores: ${analysis.typesWithScores.size}`);
    console.log(`Types without scores: ${analysis.typesWithoutScores.size}`);
    
    if (analysis.issues.length > 0) {
      console.log(`\n⚠️  ISSUES FOUND: ${analysis.issues.length}\n`);
      analysis.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.typeName} (${issue.typeId})`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Count: ${issue.count}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Recommendation: ${issue.recommendation}\n`);
      });
    } else {
      console.log('\n✅ No issues found!');
    }

    // Step 6: Engagement Details validation
    if (lessonId) {
      console.log('\n' + '='.repeat(80));
      console.log('\n📋 ENGAGEMENT DETAILS VALIDATION\n');
      
      // Get lesson structure
      const lessonResult = await client.query(
        `SELECT data FROM lessons WHERE id = $1`,
        [lessonId]
      );
      
      if (lessonResult.rows.length > 0) {
        const lessonData = lessonResult.rows[0].data;
        const stages = lessonData?.structure?.stages || [];
        
        console.log(`Lesson: ${lessonResult.rows[0].data?.title || lessonId}`);
        console.log(`Stages: ${stages.length}\n`);
        
        // Get all interactions for this lesson
        const lessonProgress = progressRecords.filter(p => p.lesson_id === lessonId);
        const interactionsByStage = {};
        
        for (const progress of lessonProgress) {
          const key = `${progress.stage_id || 'unknown'}-${progress.substage_id || 'unknown'}`;
          if (!interactionsByStage[key]) {
            interactionsByStage[key] = [];
          }
          interactionsByStage[key].push(progress);
        }
        
        // Calculate average score
        const scores = lessonProgress
          .filter(p => p.score !== null && p.score !== undefined)
          .map(p => p.score);
        
        const avgScore = scores.length > 0
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
          : null;
        
        console.log(`Total interactions: ${lessonProgress.length}`);
        console.log(`Interactions with scores: ${scores.length}`);
        console.log(`Average score: ${avgScore !== null ? avgScore + '%' : 'N/A (no scores)'}`);
        
        if (avgScore === null && lessonProgress.length > 0) {
          console.log(`\n⚠️  WARNING: No scores found for any interactions in this lesson`);
          console.log(`   Engagement Details will show "Avg: No score"`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    rl.close();
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  let userId = args[0];
  let lessonId = args[1];
  
  if (!userId) {
    userId = await question('Enter user email or ID (or press Enter to check all users): ');
  }
  
  if (!lessonId && userId) {
    lessonId = await question('Enter lesson ID (or press Enter to check all lessons): ');
  }
  
  await validateInteractionScoring(userId || null, lessonId || null);
})();
