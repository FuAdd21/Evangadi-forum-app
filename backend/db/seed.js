import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { buildPoolConfig } from "./config.js";
import {
  normalizeQuestionText,
  generateQuestionEmbedding,
  storeQuestionVector,
} from "../src/api/question/service/vector.service.js";

const generateHash = () => crypto.randomBytes(8).toString("hex");

// Seed users. If an email already exists, we reuse that user's id instead
// of failing, so this script is safe to re-run.
const SEED_USERS = [
  { firstName: "Amina", lastName: "Yusuf", email: "amina.seed@gmail.com" },
  { firstName: "Habib", lastName: "Jemal", email: "habib.seed@gmail.com" },
  { firstName: "sead", lastName: "csswe", email: "sead.seed@gmail.com" },
];

// 12 questions. Answer counts are intentionally varied:
// - a few with 0 answers (tests "Unanswered")
// - a few with 1 answer
// - a few with several answers (tests "most-answered" sort + pagination)
const SEED_QUESTIONS = [
  {
    title: "Why does my useEffect run twice in development mode?",
    content:
      "I added a console.log inside useEffect with an empty dependency array, but it logs twice every time the component mounts. Is this a bug in my code or expected behavior?",
    answers: [
      "This is expected in React 18+ when using StrictMode in development. React intentionally mounts, unmounts, and remounts components once to help you catch missing cleanup functions. It won't happen in production builds.",
      "To confirm it's StrictMode, temporarily remove <React.StrictMode> from your main.jsx and check if it only logs once. Just don't leave StrictMode off permanently, it catches real bugs.",
    ],
  },
  {
    title: "Best way to structure a Node.js Express REST API folder layout?",
    content:
      "I'm starting a new backend project with Express and MySQL. Should I organize by feature (routes/controllers/services per resource) or by type (all routes together, all controllers together)?",
    answers: [
      "Feature-based (also called 'vertical slice') organization scales much better once your app grows past a few resources. Grouping by type gets messy fast when you have 10+ resources.",
    ],
  },
  {
    title: "How do I prevent SQL injection when using mysql2 in Node.js?",
    content:
      "I'm building queries by concatenating strings with user input directly. What's the safe way to do this with the mysql2 package?",
    answers: [
      "Always use parameterized queries with placeholders (?) instead of string concatenation. With mysql2 you'd write db.execute('SELECT * FROM users WHERE email = ?', [email]) rather than embedding the variable directly into the SQL string.",
      "On top of parameterized queries, also validate and sanitize input types server-side (e.g. make sure an 'id' is actually a number) as a second layer of defense.",
      "One exception worth knowing: LIMIT/OFFSET clauses can sometimes fail as bound parameters depending on your MySQL driver version. In that specific case it's fine to inline them, but only after strictly validating they're integers in your own code first.",
    ],
  },
  {
    title: "What's the difference between npm install and npm ci?",
    content:
      "I keep seeing npm ci used in CI/CD pipelines instead of npm install. What's actually different between the two commands?",
    answers: [],
  },
  {
    title: "How can I fix 'CORS policy: No Access-Control-Allow-Origin header' errors?",
    content:
      "My React frontend on Vercel can't talk to my Express backend on Render. The browser console shows a CORS error on every request. How do I fix this on the backend?",
    answers: [
      "You need to configure the cors middleware on your Express server to explicitly allow your frontend's exact origin, for example app.use(cors({ origin: 'https://your-frontend.vercel.app' })). A wildcard '*' won't work if you're sending credentials/cookies.",
    ],
  },
  {
    title: "Should I use JWT stored in localStorage or httpOnly cookies for auth?",
    content:
      "I'm implementing login for a MERN app. Everyone online seems to disagree about where to store the JWT. What's actually the safer approach?",
    answers: [
      "httpOnly cookies are generally safer because JavaScript can't read them, which protects against XSS attacks stealing your token. localStorage is easier to implement but vulnerable if any XSS exists on your page.",
      "That said, httpOnly cookies bring their own complexity around CSRF protection, so you need SameSite cookie settings and/or CSRF tokens if you go that route. Neither option is 'set and forget'.",
    ],
  },
  {
    title: "Why is my Vite app showing a blank white screen after deploying to Vercel?",
    content:
      "Locally npm run dev works fine, but after deploying to Vercel the site loads a completely blank page with no errors in the terminal. DevTools console shows a 404 for my JS bundle.",
    answers: [
      "This usually happens when the base path in vite.config.js doesn't match your deployment path, or when Vercel's output directory setting doesn't point to 'dist'. Double check Project Settings > Build & Development Settings on Vercel.",
    ],
  },
  {
    title: "What is the difference between git merge and git rebase?",
    content:
      "I understand both combine changes from one branch into another, but I don't understand when I should use one over the other.",
    answers: [
      "git merge creates a new merge commit and preserves the full history of both branches exactly as it happened. git rebase rewrites your branch's commits on top of the target branch, producing a cleaner, linear history but altering commit hashes.",
      "General rule of thumb: rebase your local feature branches before merging to keep history clean, but never rebase a branch that others are already collaborating on, since it rewrites shared history.",
    ],
  },
  {
    title: "How do I debug 'ER_WRONG_ARGUMENTS: Incorrect arguments to mysqld_stmt_execute'?",
    content:
      "My paginated query works fine locally but throws this error only in production against my hosted MySQL database. The query uses LIMIT ? OFFSET ? as bound parameters.",
    answers: [
      "This is a known mysql2 quirk with prepared statements (execute()) and LIMIT/OFFSET placeholders on certain server/driver combinations. The safest fix is to strictly validate the limit/offset as integers in your code, then inline them directly into the SQL string instead of binding them as params.",
    ],
  },
  {
    title: "What's a good approach for handling file uploads (PDFs) in an Express app?",
    content:
      "I need users to upload PDF files that later get processed for text extraction. Should I store them on disk, in the database as BLOBs, or somewhere else entirely?",
    answers: [],
  },
  {
    title: "How does semantic search with vector embeddings actually work?",
    content:
      "I keep hearing about 'embeddings' and 'vector similarity search' for AI-powered search features. Can someone explain the concept simply, without assuming a machine learning background?",
    answers: [
      "An embedding is just a list of numbers (a vector) that represents the 'meaning' of a piece of text, generated by an AI model. Texts with similar meaning end up with vectors that are mathematically close together, even if they don't share any of the same words.",
      "To search, you convert the user's search query into its own embedding, then compare it against all the stored embeddings using a distance measure like cosine similarity, and return whichever stored items are 'closest' in that vector space.",
      "In practice you don't need to implement the math yourself, libraries and AI APIs like Gemini or OpenAI can generate embeddings for you, and you just store the resulting numbers array in your database.",
      "One gotcha to know upfront: embeddings only make sense to compare when generated by the same model. You can't compare a Gemini embedding to an OpenAI embedding meaningfully.",
    ],
  },
  {
    title: "Why does my Render backend say 'self-signed certificate in certificate chain'?",
    content:
      "My Node backend can't connect to my MySQL database once deployed on Render, but it connects fine locally. The error is about a self-signed certificate.",
    answers: [
      "This happens because your managed MySQL provider (like Aiven) presents a certificate that Node's default TLS settings can't verify. You need to explicitly enable SSL in your DB connection config and, if you don't have the provider's CA certificate loaded, set rejectUnauthorized to false as a quick fix.",
    ],
  },
];

const run = async () => {
  const connection = await mysql.createConnection(buildPoolConfig());

  try {
    console.log("Connecting to database...");

    // 1. Ensure seed users exist (create if missing, reuse if present)
    const userIds = [];
    const dummyPasswordHash = await bcrypt.hash("SeedPass123!", 10);

    for (const user of SEED_USERS) {
      const [existing] = await connection.query(
        "SELECT user_id FROM users WHERE email = ? LIMIT 1",
        [user.email],
      );

      if (existing.length > 0) {
        userIds.push(existing[0].user_id);
        continue;
      }

      const [result] = await connection.query(
        `INSERT INTO users (first_name, last_name, email, password_hash)
         VALUES (?, ?, ?, ?)`,
        [user.firstName, user.lastName, user.email, dummyPasswordHash],
      );
      userIds.push(result.insertId);
      console.log(`Created seed user: ${user.firstName} ${user.lastName}`);
    }

    // 2. Insert questions, rotating through seed users as authors
    let questionsCreated = 0;
    let answersCreated = 0;
    let embeddingsCreated = 0;
    let embeddingsFailed = 0;

    for (let i = 0; i < SEED_QUESTIONS.length; i++) {
      const q = SEED_QUESTIONS[i];
      const authorId = userIds[i % userIds.length];
      const questionHash = generateHash();

      const [qResult] = await connection.query(
        `INSERT INTO questions (question_hash, user_id, title, content)
         VALUES (?, ?, ?, ?)`,
        [questionHash, authorId, q.title, q.content],
      );
      const questionId = qResult.insertId;
      questionsCreated++;

      for (let a = 0; a < q.answers.length; a++) {
        const answerAuthorId = userIds[(i + a + 1) % userIds.length];
        await connection.query(
          `INSERT INTO answers (question_id, user_id, content)
           VALUES (?, ?, ?)`,
          [questionId, answerAuthorId, q.answers[a]],
        );
        answersCreated++;
      }

      // Generate a real embedding, same as production question creation,
      // so seeded questions participate in "similar questions" search too.
      const sourceText = normalizeQuestionText({
        title: `${q.title} ${q.content}`.trim(),
      });

      try {
        const embeddingResult = await generateQuestionEmbedding(sourceText, {
          questionId,
        });

        if (!embeddingResult?.embedding?.length) {
          throw new Error("Failed to generate embedding");
        }

        await storeQuestionVector({
          questionId,
          sourceText,
          embedding: embeddingResult.embedding,
          status: "ready",
        });
        embeddingsCreated++;
        console.log(`  embedded (${i + 1}/${SEED_QUESTIONS.length}): ${q.title.slice(0, 60)}...`);
      } catch (error) {
        console.error(`  embedding failed for "${q.title.slice(0, 60)}...":`, error.message);
        await storeQuestionVector({
          questionId,
          sourceText,
          embedding: [],
          status: "failed",
        }).catch(() => {});
        embeddingsFailed++;
      }

      // Small delay between Gemini calls to stay comfortably under free-tier rate limits.
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(
      ` Seeded ${questionsCreated} questions, ${answersCreated} answers, ${embeddingsCreated} embeddings ready (${embeddingsFailed} failed).`,
    );
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(" Seeding failed:", error.message);
  process.exit(1);
});