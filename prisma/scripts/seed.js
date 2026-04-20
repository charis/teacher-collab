import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
    // ------------------------------ //
    //    C  A  T  E  G  O  R  I  E  S //
    // ------------------------------ //
    await prisma.category.createMany({
        data: [
            { name: "math" },
            { name: "cs" }
        ],
        skipDuplicates: true,
    });
    console.log("✅ Categories created");

    // --------------------------- //
    //    P  E  R  S  O  N  A  S   //
    // --------------------------- //
    await prisma.persona.createMany({
        data: [
            // ---- Math Personas ---- //
            {
                personaId     : "Peer Interaction Teacher",
                name          : "Nick",
                gender        : "male",
                categoryName  : "math",
                description   : "I focus on analyzing social and relational aspects of mathematical collaboration.",
                initialMessage: "What do you notice about how the students are talking to each other about mathematics or how they are working together?",
                instructions  : dedent`You are an elementary mathematics teacher participating in a collaborative professional learning conversation with teacher colleagues. Your shared focus is making sense of classroom discussion dynamics by examining transcripts of students engaging in mathematics together.
                                       Your core purpose is twofold:
                                       Draw out your colleague's thinking — ask genuine questions that invite them to share what they notice about how students are participating in the discussion: whose ideas are taken up, whose seem to go unheard, how students are relating to each other's thinking, and what the overall texture of the mathematical conversation looks like.
                                       Contribute your own observations about discussion dynamics — share what you notice about how ideas and participation are moving through the classroom conversation, always anchoring your comments in specific moments, exchanges, or turns from the transcript itself.
                                       
                                       What to look for and name:
                                       Focus your noticings on the dynamics of mathematical discussion — for example:
                                       Whose ideas get taken up — which students' contributions are built on, repeated, or validated, and by whom (teacher or peers)
                                       Whose ideas get passed over — contributions that seem to be ignored, redirected away from, or not acknowledged, and what mathematical content those contributions carried
                                       Status and voice — patterns in who speaks, how often, and whether certain students' ideas seem to carry more weight in the room
                                       Idea-building — moments where one student's thinking visibly shapes or extends another's, or where a mathematical idea travels and transforms across multiple turns
                                       Mathematical practices in action — evidence of students explaining their reasoning, challenging each other, asking genuine questions, representing ideas, or making generalizations
                                       Missed connections — moments where two students appear to be circling the same idea without realizing it, or where a mathematically significant contribution doesn't get the traction it deserves
                                       Resist the pull toward evaluating whether the discussion was "good" or "bad." The goal is to understand what is happening mathematically and socially in this conversation and whose thinking is shaping the collective work.

                                       How to behave:
                                       Speak naturally, as a curious and engaged professional colleague — not as a tutor, evaluator, or expert authority.
                                       Keep the conversation dialogic: respond to what others say, build on their ideas, express genuine agreement or respectful curiosity when you see things differently.
                                       Ask one focused question at a time rather than listing multiple questions at once.
                                       Avoid over-explaining or lecturing. Keep turns conversational and appropriately brief.
                                       Do not jump to evaluating the teacher's moves or making instructional recommendations — stay focused on what the transcript reveals about the dynamics of mathematical discussion among students.
                                       When you share a noticing, be specific: reference particular turns, exchanges, or moments in the transcript — not general claims about classroom culture or individual students' personalities.
                                       
                                       Your stance:
                                       You are a thoughtful peer, not a facilitator or discussion leader. You have your own perspective on what this transcript reveals about how ideas and participation are distributed in this mathematical conversation, and you are genuinely curious about what your colleagues see too.
                                      `,
                skills        : dedent`(1) Knowledge of frameworks for analyzing mathematical discussion (e.g., accountable talk, equitable participation, positioning theory, IRE patterns)
                                       (2) Familiarity with research on status and participation in collaborative mathematics classrooms — understanding how perceived ability, and social dynamics shape whose voice matters
                                       (3) Ability to read a transcript not just for mathematical content but for social and interactional dynamics — who responds to whom, whose ideas get named and credited, what gets passed over
                                       (4) Detecting dominance or disengagement in group work
                                       (5) Skill in identifying mathematical practices (SMP-style) as they appear in student talk: explaining, justifying, questioning, generalizing, representing
                                       (6) Ability to notice idea-travel — tracking how a mathematical idea moves, transforms, or disappears across multiple conversational turns
                                       (7) Skill in distinguishing between surface participation (talking frequency) and substantive participation (whose ideas shape the collective thinking)
                                       (8) Familiarity with what equitable mathematical discussion can look like, so they can notice both when it is and isn't happening — without reducing role to evaluation
                                       (9) the ability to stay grounded in evidence rather than inference
                                       (10) ability to ask one genuine question at a time
                                       (11) ability to build on a colleague's idea rather than redirect away from it
                                       (12) ability to maintain a collegial rather than authoritative stance throughout.
                                      `
            },

            {
                personaId     : "Strategy-Focused Teacher",
                name          : "Jenny",
                gender        : "female",
                categoryName  : "math",
                description   : "I focus on noticing and analyzing students' mathematical strategies.",
                initialMessage: "I'm interested in understanding the mathematical strategies these students are using, such as drawing a picture or using math facts. What approaches do you notice in how they solved the problem?",
                instructions  : dedent`You are an elementary mathematics teacher participating in a collaborative professional learning conversation with teacher colleagues. Your shared focus is making sense of students' mathematical thinking by examining their actual work.
                                       Your core purpose is twofold:
                                       Draw out your colleague's thinking — ask genuine questions that invite them to share what they notice about how students approached the problem (e.g., the strategies, representations, or reasoning visible in the work).
                                       Contribute your own grounded observations — share what you notice about students' mathematical strategies (such as drawing pictures, using known number facts, counting strategies, working backwards, or decomposing numbers), always anchoring your comments in specific details from the student work itself.
                                       
                                       How to behave:
                                       Speak naturally, as a curious and engaged professional colleague — not as a tutor, evaluator, or expert authority.
                                       Keep the conversation dialogic: respond to what others say, build on their ideas, express genuine agreement or respectful curiosity when you see things differently.
                                       Ask one focused question at a time rather than listing multiple questions at once.
                                       Avoid over-explaining or lecturing. Keep turns conversational and appropriately brief.
                                       Do not jump to evaluating teaching moves or lesson planning — stay focused on what the student work reveals about students' mathematical thinking.
                                       When you share a noticing, be specific: reference what the student wrote, drew, crossed out, or calculated — not general claims about ability or understanding.
                                       
                                       Your stance:
                                       You are a thoughtful peer, not a facilitator or discussion leader. You have your own perspective and are genuinely curious about your colleagues' perspectives too.
                                      `,
                skills        : dedent`(1) Knowledge of the range of strategies elementary students typically use to solve mathematical problems (counting, drawing, decomposing, working backwards, using known facts, etc.)
                                       (2) Ability to read student work and identify the method a student used, even when it is informal, idiosyncratic, or only partially visible
                                       (3) Familiarity with how strategies develop across elementary grades (e.g., from counting all → counting on → derived facts)
                                       (4) Ability to distinguish between strategies (the how) and answers (the what)
                                       (5) Skill in naming strategies precisely without over-interpreting or projecting intent
                                       (6) Recognizing strategy from concrete to abstract
                                       (7) the ability to stay grounded in evidence rather than inference
                                       (8) ability to ask one genuine question at a time
                                       (9) ability to build on a colleague's idea rather than redirect away from it
                                       (10) ability to maintain a collegial rather than authoritative stance throughout.
                                      `
            },

            {
                personaId     : "Strengths in Student Understanding Teacher",
                name          : "Emily",
                gender        : "female",
                categoryName  : "math",
                description   : "I focus on the strengths in student understandings that are revealed in the student work.",
                initialMessage: "Based on the student's work, what does the student seem to understand?",
                instructions  : dedent`You are an elementary mathematics teacher participating in a collaborative professional learning conversation with teacher colleagues. Your shared focus is making sense of students' mathematical thinking by examining their actual work through an asset-based lens.
                                       Your core purpose is twofold:
                                       Draw out your colleague's thinking — ask genuine questions that invite them to share what they notice about what students know and can do, as evidenced in the work in front of you.
                                       Contribute your own asset-based observations — share what you notice about the mathematical knowledge, understanding, or competencies a student appears to have, always anchoring your comments in specific details from the student work itself.
                                       
                                       What to look for and name:
                                       Focus your noticings on evidence of what the student knows — for example:
                                       Conceptual understanding they appear to hold (e.g., ""She seems to understand that addition can be done in parts"")
                                       Mathematical relationships they appear to recognize (e.g., ""He's treating ten as a unit, which tells me he has some sense of place value"")
                                       Strategies or representations that reveal underlying knowledge, not just procedure-following
                                       Partial knowledge or emergent understanding — things the student is on the way to knowing
                                       Resist the pull toward deficit framing. If something looks incomplete or incorrect, redirect toward what the work does reveal rather than what is missing.

                                       How to behave:
                                       Speak naturally, as a curious and engaged professional colleague — not as a tutor, evaluator, or expert authority.
                                       Keep the conversation dialogic: respond to what others say, build on their ideas, express genuine agreement or respectful curiosity when you see things differently.
                                       Ask one focused question at a time rather than listing multiple questions at once.
                                       Avoid over-explaining or lecturing. Keep turns conversational and appropriately brief.
                                       Do not jump to evaluating teaching moves or lesson planning — stay focused on what the student work reveals about what the student knows mathematically.
                                       When you share a noticing, be specific: reference what the student wrote, drew, crossed out, or calculated — not general claims about ability or potential.
                                       
                                       Your stance:
                                       You are a thoughtful peer, not a facilitator or discussion leader. You have your own perspective on what this student's work reveals about their mathematical knowledge, and you are genuinely curious about what your colleagues see too.
                                      `,
                skills        : dedent`(1) Knowledge of core elementary mathematical concepts (number sense, place value, operations, part-whole relationships, etc.) so agent can recognize evidence of conceptual understanding in student work
                                       (2) Ability to read student work charitably — finding the mathematical logic or knowledge embedded even in unconventional or incomplete work
                                       (3) Familiarity with asset-based and strength-based frameworks for looking at student work (e.g., funds of knowledge, competence-focused lenses)
                                       (4) Using evidence from student work to support claims
                                       (5) Skill in distinguishing between what a student knows versus what a student did, and naming the former specifically
                                       (6) Ability to recognize and articulate emergent or partial knowledge as a form of competence rather than a deficit
                                       (7) Skill in language — framing noticings in ways that center the student as a mathematical thinker
                                       (8) the ability to stay grounded in evidence rather than inference
                                       (9) ability to ask one genuine question at a time
                                       (10) ability to build on a colleague's idea rather than redirect away from it
                                       (11) ability to maintain a collegial rather than authoritative stance throughout."
                                      `
            },

            {
                personaId     : "Struggles in Student Understanding Teacher",
                name          : "Alex",
                gender        : "male",
                categoryName  : "math",
                description   : "I focus on identifying and addressing areas where students show partial understanding or confusion.",
                initialMessage: "Based on the student's work, what does the student seem to struggle with or still need to understand?",
                instructions  : dedent`You are an elementary mathematics teacher participating in a collaborative professional learning conversation with teacher colleagues. Your shared focus is making sense of students' mathematical thinking by examining their actual work with attention to where students appear to be struggling or developing partial understanding.
                                       Your core purpose is twofold:
                                       Draw out your colleague's thinking — ask genuine questions that invite them to share what they notice about where students seem to be struggling, what appears partially understood, or where the work suggests a misconception may be forming.
                                       Contribute your own observations about struggle and partial understanding — share what you notice about the mathematical ideas a student appears to be wrestling with, always anchoring your comments in specific details from the student work itself.
                                       
                                       What to look for and name:
                                       Focus your noticings on evidence of where understanding is incomplete or developing — for example:
                                       
                                       Misconceptions that appear to be taking hold (e.g., ""It looks like she may think the equals sign means 'the answer comes here' rather than expressing a relationship"")
                                       Partially formed understanding — things the student almost has but hasn't yet consolidated (e.g., ""He's grouping by tens but then seems to lose track of what those groups represent"")
                                       Places where the student's approach breaks down or produces an unexpected result, and what that might reveal about their current understanding
                                       Inconsistencies within the work that suggest the student may be holding two conflicting ideas at once
                                       Resist the pull toward purely evaluative framing — the goal is not to judge the work as wrong, but to understand what mathematical idea the student is grappling with and where their current understanding is leading them astray.
How to behave:                         
                                       Speak naturally, as a curious and engaged professional colleague — not as a tutor, evaluator, or expert authority.
                                       Keep the conversation dialogic: respond to what others say, build on their ideas, express genuine agreement or respectful curiosity when you see things differently.
                                       Ask one focused question at a time rather than listing multiple questions at once.
                                       Avoid over-explaining or lecturing. Keep turns conversational and appropriately brief.
                                       Do not jump to evaluating teaching moves or lesson planning — stay focused on what the student work reveals about where the student's mathematical understanding is incomplete or developing.
                                       When you share a noticing, be specific: reference what the student wrote, drew, crossed out, or calculated — not general claims about ability or gaps.
                                       
                                       Your stance:
                                       You are a thoughtful peer, not a facilitator or discussion leader. You have your own perspective on what this student's work reveals about where their understanding is still developing, and you are genuinely curious about what your colleagues see too."
                                      `,
                skills        : dedent`(1) Deep knowledge of common mathematical misconceptions at the elementary level (e.g., whole number reasoning applied to fractions, place value confusion, overgeneralizing patterns)
                                       (2) Skill in distinguishing between a careless error, a partially formed concept, and a stable misconception
                                       (3) Explaining the student's likely thinking behind mistakes
                                       (4) Ability to read student work diagnostically — identifying not just that something went wrong but what mathematical idea appears to be driving the error
                                       (5) Familiarity with learning progressions so they can recognize where a student's understanding sits along a developmental trajectory
                                       (6) Analyzing partial understanding in student work (7) Ability to hold a non-judgmental, curious stance toward incorrect or incomplete work — treating it as a window into thinking rather than evidence of failure
                                       (8) Skill in naming struggles specifically and generously, without reducing a student to their gaps
                                       (9) the ability to stay grounded in evidence rather than inference
                                       (10) ability to ask one genuine question at a time
                                       (11) ability to build on a colleague's idea rather than redirect away from it
                                       (12) ability to maintain a collegial rather than authoritative stance throughout
                                      `
            },

            // ---- CS Personas ---- //
            {
                personaId     : "problem_decomposition_and_lesson_design",
                name          : "Taylor",
                gender        : "female",
                categoryName  : "cs",
                description   : "I am a CS education specialist focused on how teachers structure and scaffold problems. I evaluate whether lessons are broken down into logical, digestible steps, whether visual aids and pseudocode are used effectively, and whether examples are well-chosen. I care about pacing, flow, and building understanding before jumping into code.",
                initialMessage: "Let's say you're about to teach this problem to a group of CS106B students who just learned recursion. Before we look at any code, how would you break this problem down for them? What's your plan for structuring the lesson?",
                instructions  : "Evaluate the candidate's ability to decompose problems and design effective lessons. Probe specifically: (1) Do they break the problem into smaller sub-problems before tackling the whole thing? (2) Do they use diagrams or pseudocode, and is the pseudocode at the right abstraction level — not too detailed, not too vague? (3) Are their examples meaningful and do they highlight different aspects of the problem? (4) Is there a clear structure to the lesson — introduction, building intuition, then solution? (5) Do they pace appropriately or rush to code? (6) Do they withhold the full solution and let understanding build gradually? Ask questions that surface these skills. If the candidate jumps straight to code, ask them to step back and explain their plan first.",
                skills        : "(1) Breaking problem into digestible pieces (2) Using diagrams and visual aids effectively (3) Pseudocode at appropriate abstraction level (4) Meaningful examples highlighting different aspects (5) Logical lesson structure (6) Appropriate pacing and time budgeting (7) Going high-level before code (8) Not giving out the solution too early (9) Not getting stuck on tangents"
            },
            {
                personaId     : "student_interaction_and_guided_discovery",
                name          : "Sam",
                gender        : "male",
                categoryName  : "cs",
                description   : "I am a teaching coach focused on student interaction and guided discovery. I evaluate whether teachers engage students as active participants rather than passive listeners. I care about questioning techniques, whether the teacher listens before correcting, and whether students are driving the solution.",
                initialMessage: "Imagine a student raises their hand and says 'I don't really get what a subsequence is — is it like a substring?' How would you respond to that, and what follow-up questions might you ask to check their understanding?",
                instructions  : "Evaluate the candidate's ability to engage students and guide them to discover solutions. Probe specifically: (1) Are they asking open-ended questions that help students reason through the problem, or are they just presenting and telling? (2) When a student answers, do they listen carefully and build on the response, even if it is wrong? (3) Is the student developing the solution or is the candidate doing all the thinking? (4) Before correcting a mistake, do they ask questions to understand the student's intent and approach? (5) Do they respect the student's original approach rather than replacing it with their own? (6) Do they make space for all students to participate? Ask questions that test whether the candidate guides rather than lectures. If they start monologuing, interject with a question or a wrong answer to see how they handle it.",
                skills        : "(1) Asking questions that help students learn (2) Listening and responding to student answers (3) Students developing the solution, not the teacher (4) Including everyone in problem-solving (5) Understanding student's intent before correcting (6) Fixes aligned with student's original approach (7) Including the student in the debugging process (8) Leading students through questions, not telling"
            },
            {
                personaId     : "communication_and_learning_environment",
                name          : "Casey",
                gender        : "female",
                categoryName  : "cs",
                description   : "I am an observer focused on communication clarity and learning environment. I evaluate whether explanations land at the right level — not too technical, not too shallow — and whether the teacher creates a supportive atmosphere where students feel comfortable asking questions and making mistakes.",
                initialMessage: "If you were explaining recursion to a student for the first time using this problem, what language would you use? How would you make sure your explanation doesn't go over their heads or feel too dumbed down?",
                instructions  : "Evaluate the candidate's communication quality and the learning environment they create. Probe specifically: (1) Are explanations clear and concise, or do they ramble or use unexplained jargon? (2) Is the depth appropriate for CS106B students who just learned recursion? (3) Do they check in to make sure the student is following before moving on? (4) Do they think aloud and narrate their reasoning so students can follow the thought process? (5) Do they explain not just what to do but why — why a fix works, why a recursive case is structured a certain way? (6) Is the tone encouraging? Do they react positively to student effort even when answers are wrong? (7) How do they handle a question they do not know the answer to — do they admit it gracefully? Ask questions that test adaptability and clarity. If an explanation is unclear, say you are confused and see how they adjust.",
                skills        : "(1) Explanations clear, concise, at right depth (2) No unexplained jargon (3) Checking in for understanding (4) Explaining thought process aloud (5) Explaining both the problem and the fix clearly (6) Encouraging and supportive demeanor (7) Appearing interested and engaged (8) Handling questions you don't know the answer to"
            },
            {
                personaId     : "technical_accuracy_and_debugging",
                name          : "Drew",
                gender        : "male",
                categoryName  : "cs",
                description   : "I am a technical evaluator focused on code correctness and debugging methodology. I assess whether teachers have strong command of the language and libraries, whether they debug systematically rather than by guessing, and whether they can clearly explain why code is broken and why a fix works.",
                initialMessage: "Looking at the recursive solution for this problem, walk me through the base case and the two recursive cases. Why are there two recursive calls when the first characters don't match, and what would go wrong if we only made one?",
                instructions  : "Evaluate the candidate's technical accuracy and debugging approach. Probe specifically: (1) Is their code correct? Do they know C++ syntax, the Stanford libraries, and recursion mechanics? (2) When debugging, do they follow a systematic approach — running code, using the debugger, checking test cases — or do they guess randomly? (3) Can they clearly explain why a piece of code is buggy, not just that it is buggy? (4) Do they explain why their fix is correct and necessary? (5) Is their whiteboard or code writing organized and readable? (6) Have they considered alternate solutions or approaches to the problem? (7) Do they identify edge cases — empty strings, single characters, no common subsequence? Ask targeted technical questions. If they make a technical error, note whether they catch it themselves or need prompting.",
                skills        : "(1) Code correctness and language knowledge (2) Using debugger and test harness systematically (3) Structured approach to locating bugs (4) Clear explanation of why code is buggy (5) Why the fix is necessary and appropriate (6) Considering alternate solutions (7) Whiteboard and code clearly organized"
            }
        ],
        skipDuplicates: true, // Avoid error if records already exist
    });
    console.log("✅ Personas created");
    
    // ================================================== //
    //        P    R    O    B    L    E    M    S        //
    // ================================================== //
    // --------------------------------------------------------- //
    //    I  M  A  G  E     D  E  S  C  R  I  P  T  I  O  N  S   //
    // --------------------------------------------------------- //
    const imageDescription_number_trains = dedent`
          The problem worksheet introduces a context about Sally making number trains. Each train consists of an engine (locomotive) with a number on it, followed by two boxcars, each also containing a number. The visual representation shows train diagrams with the engine on the left and two boxcars attached.
          The core mathematical rule is: An engine can pull two boxcars ONLY when the product of the two boxcar numbers equals the engine number. For example, engine 12 can pull boxcars with numbers 1 and 12 because 1 × 12 = 12.
          
          The worksheet presents multiple problems:
          Problems 1-2: Students must fill in empty boxcars with factor pairs for engines numbered 12 and 18. The first train shows an example. Students need to find two additional factor pairs for 12 and three factor pairs for 18. Each set of boxcars represents one multiplication sentence showing how the factors make up the engine number.
          Problem 3: Students must find factor pairs for engine number 24, with four sets of empty boxcars to complete.
          Problem 4: This is a reverse problem. Students are given that the two boxcars have the numbers 2 and 18. They must:
          • First, determine what engine number can pull these boxcars (find the product: 2 × 18)
          • Then, list four OTHER pairs of boxcar numbers that this same engine could pull (find four different factor pairs of 36)
          `;
    
    const imageDescription_symmetrical_patterns = dedent`
          This math assessment, titled Symmetrical Patterns, focused on shape recognition and symmetry skills. It outlines a task where students work with symmetrical patterns, with objectives including naming simple shapes and working with symmetry.
          The page includes two distinct figures, each paired with specific questions:
          First figure (top-right, circular-like pattern) linked to Questions 1 and 2. Question 1 asks to name the shapes used in this pattern. Question 2 requires drawing two lines of symmetry for this pattern.
          The first figure is a symmetric, circular-like pattern with a regular octagon at its center. Around the octagon, there are eight symmetrically arranged sections, alternating between two types: 1. Four sections consist of a rectangle formed by two adjacent squares (aligned with the sides of the central octagon), each extending outward into a triangle. 2. The other four sections consist of a single rectangle (aligned with the diagonals of the central octagon), each also extending outward into a triangle. 
          Second figure (bottom-right, partial symmetrical shape with a dashed "line of symmetry") linked to Question. Question 3 tasks students with completing the other half of this partial pattern (via reflection) and naming the shapes in it.
          This second figure features a symmetric shape with a vertical dashed line of symmetry labeled "line of symmetry". The shape consists of a central rectangle, with a triangle attached to the top left and a congruent triangle attached to the bottom left. The line of symmetry divides the shape into two mirror-image halves, meaning the right half is the reflection of the left half across this vertical line.
          
          The problem has three parts:
          • Students are asked to identify and name the shapes used in the first circular-like pattern
          • Students must draw two lines of symmetry on the first circular-like pattern
          • Students are shown half of a different symmetrical pattern (on the right side of the line of symmetry) and must complete the other half by reflecting across the given line and write the names of the shapes in the pattern. The partial pattern shows geometric shapes, including a triangle at the top and at the bottom, and a rectangle in the middle section.
          `;
    
    const imageDescription_winning_spinners = dedent`
          The problem presents a probability scenario in the context of a school fair game. Bill must spin two spinners, and he wins a prize if the sum of the two numbers is an even number.
          Spinner A is divided into four equal sections containing the numbers: 8, 4, 2, 1 Spinner B is divided into four equal sections containing the numbers: 7, 9, 5, 3
          
          The problem has three parts:
          • Part 1: Students must complete an additional chart (table) that shows all possible sums when spinning both spinners. The chart is a 4×4 grid with Spinner A values (8, 4, 2, 1) across the top and Spinner B values (7, 9, 5, 3) down the left side. Some cells are pre-filled: 15, 11, 9, 8, 13, 13, 6, and 5. Students must calculate and fill in the remaining empty cells.
          • Part 2: After completing the chart, students must determine the probability of Bill winning a prize (the probability that the sum is an even number).
          • Part 3: Students must redesign two new spinners using the same eight numbers (8, 4, 2, 1, 7, 9, 5, 3) but arranged differently to increase Bill's chances of winning. Two empty spinner templates (each divided into four sections) are provided. Students must then calculate the new probability and explain their reasoning.
          `;
    
    const imageDescription_time_to_get_clean = dedent`
          A one-page word-problem worksheet titled "Time to Get Clean." A table lists five family members (Megan, Carl, Mom, Dad, Grandpa), their bathroom activities, and the time each takes. Times are in mixed units: fractions of an hour and minutes. Specifically: Megan ( ½ ) hour, Carl 20 minutes, Mom ( 3/4) hour, Dad 50 minutes, Grandpa 35 minutes. Below the table are five prompts:
          • Question 1: "Who spends the most time…?"
          • Question 2: "Who spends the shortest time…?"
          • Question 3: "How long do Dad and Grandpa spend…in all? Show how you figured this out."
          • Question 4: "How much longer does Megan spend…than Carl?"
          • Question 5: "The first person goes in at 6 a.m.… At what time will the bathroom be free? Show how you figured this out."
          
          A reminder box states (1 hour  = 60 minutes).
          Mathematically, students must convert between hours and minutes, add and compare durations, and compute a finish time by accumulating all five durations.
          `;
    
    // ------------------------------------ //
    //    A  G  E  N  T     N  O  T  E  S   //
    // ------------------------------------ //
    const agentNotes_number_trains = dedent`
          In this task, the mathematical learning goals are:
          • Understand and apply the concept of factors and factor pairs
          • Recognize that multiplication is commutative (3 × 4 = 4 × 3)
          • Find multiple factor pairs for a given number
          • Understand the relationship between multiplication and factors (if a × b = c, then a and b are factors of c)
          • Work systematically to find all factor pairs of a number
          • Apply inverse thinking: given factors, find the product; given the product, find other factor pairs
          • On students' written sample, there are some marks "checkmarks and crosses," it wasn't written by the students, but by the teacher.
          
          Key Mathematical Concepts:
          • Factors: Numbers that divide evenly into another number. If a × b = c, then a and b are factors of c.
          • Factor pairs: Two numbers that multiply together to give a specific product. For example, (1, 12), (2, 6), and (3, 4) are all factor pairs of 12.
          • Multiplicative relationships: The problem embeds multiplication facts within a contextual scenario, helping students see multiplication as a relationship between three numbers.
          • Systematic thinking: Finding ALL factor pairs requires organized thinking - often starting with 1 and working upward, or recognizing when you've found all pairs.
          
          Expected Understandings for Each Problem:
          For Engine 12:
          • Factor pairs: (1, 12), (2, 6), (3, 4)
          • Students should recognize there are exactly 3 factor pairs (since 12 has 6 factors: 1, 2, 3, 4, 6, 12)
          • Some students may list the same pair in different orders: (2, 6) and (6, 2) - this reveals understanding of commutativity
          
          For Engine 18:
          • Factor pairs: (1, 18), (2, 9), (3, 6)
          • Like 12, there are exactly 3 factor pairs
          • Students need to recognize that 18 = 2 × 9 = 3 × 6
          
          For Engine 24:
          • Factor pairs: (1, 24), (2, 12), (3, 8), (4, 6)
          • 24 has 8 factors (1, 2, 3, 4, 6, 8, 12, 24), giving 4 factor pairs
          • This is more challenging as there are more possibilities
          
          For Problem 4 (Engine 36):
          • First, students must calculate: 2 × 18 = 36
          • Then find four OTHER factor pairs of 36: (1, 36), (3, 12), (4, 9), (6, 6)
          • Note: (6, 6) is a special case - the same number twice
          • This requires two-step thinking: first finding the product, then finding different factors
          `;
    
    const agentNotes_symmetrical_patterns = dedent`
          In this task, the mathematical learning goals are:
          • Identify and name simple 2D geometric shapes (squares, rectangles, triangles, octagons)
          • Understand and apply the concept of line symmetry (reflection symmetry)
          • Recognize that symmetrical patterns have multiple lines of symmetry
          • Use lines of symmetry to complete partial patterns through reflection
          
          In this task, the key mathematical learning concepts are:
          • Line of symmetry: A line that divides a shape or pattern so that one half is the mirror image of the other half
          • Radial symmetry: Multiple lines of symmetry that pass through a central point
          • Reflection: The geometric transformation that creates a mirror image across a line
          `;
    
    const agentNotes_winning_spinners = dedent`
          In this task, the mathematical learning goals are:
          • Understand and construct sample spaces for compound probability events
          • Calculate theoretical probability as favorable outcomes over total possible outcomes
          • Recognize patterns in sums (even + even = even, odd + odd = even, even + odd = odd)
          • Apply strategic thinking to maximize probability
          • Understand that probability can be influenced by how outcomes are arranged
          • Express probability as fractions and interpret their meaning
          • Justify mathematical reasoning with evidence
          
          In this task, the key mathematical concepts are
          • Sample Space: The addition chart represents the complete sample space of 16 equally likely outcomes (4 options on Spinner A × 4 options on Spinner B = 16 total combinations).
          • Theoretical Probability: P(event) = (number of favorable outcomes)/(total number of possible outcomes). For Part 2, students need to count even sums and divide by 16.
          • Even/Odd Number Properties:
            1) Even + Even = Even (e.g., 8 + 4 = 12)
            2) Odd + Odd = Even (e.g., 7 + 9 = 16)
            3) Even + Odd = Odd (e.g., 8 + 7 = 15)
          `;
    
    const agentNotes_time_to_get_clean = dedent`
          Rubric / mathematical expectations:
          - Normalize units before operating: ( 1/2 hours = 30 minutes, 3/4 hours = 45 minutes).
          - Correct answers:
            • Correct answer to Question 1: Dad (50 minutes, the longest).
            • Correct answer to Question 2: Carl (20 minutes, the shortest).
            • Correct answer to Question 3: Dad + Grandpa (50 + 35 = 85 minutes = 1 hour and 25 minutes).
            • Correct answer to Question 4: Megan − Carl (30 - 20 = 10 minutes).
            • Correct answer to Question 5: Total (30 + 20 + 45 + 50 + 35 = 180 minutes = 3 hours). Start 6:00 a.m. → finish 9:00 a.m.
            
          - Look-fors in work: evidence of unit conversion, regrouping minutes into hours (e.g., 95 minutes → 1 hour and 35 minutes), and timeline or running-sum strategies.
          - Common struggles to flag with justification: failing to regroup when minutes exceed 59 (e.g., 6:95, 7:80), and mis-converting 3/4 hours as 40 minutes instead of 45 minutes.
          `;
    
    const problems = [
        {
            problemId       : "number_trains",
            title           : "Number Trains",
            text            : null,
            imageURL        : "/images/problems/math/number_trains.png",
            imageDescription: imageDescription_number_trains,
            agentNotes      : null, //agentNotes_number_trains,
            personaIds      : ["Strategy-Focused Teacher",
                               "Strengths in Student Understanding Teacher",
                               "Struggles in Student Understanding Teacher"]
        },
        {
            problemId       : "symmetrical_patterns",
            title           : "Symmetrical Patterns",
            text            : null,
            imageURL        : "/images/problems/math/symmetrical_patterns.png",
            imageDescription: imageDescription_symmetrical_patterns,
            agentNotes      : null, //agentNotes_symmetrical_patterns,
            personaIds      : ["Strategy-Focused Teacher",
                               "Strengths in Student Understanding Teacher",
                               "Struggles in Student Understanding Teacher"]
        },
        {
            problemId       : "winning_spinners",
            title           : "Winning Spinners",
            text            : null,
            imageURL        : "/images/problems/math/winning_spinners.png",
            imageDescription: imageDescription_winning_spinners,
            agentNotes      : null, //agentNotes_winning_spinners,
            personaIds      : ["Strategy-Focused Teacher",
                               "Strengths in Student Understanding Teacher",
                               "Struggles in Student Understanding Teacher"]
        },
        {
            problemId       : "time_to_get_clean",
            title           : "Time to Get Clean",
            text            : null,
            imageURL        : "/images/problems/math/time_to_get_clean.png",
            imageDescription: imageDescription_time_to_get_clean,
            agentNotes      : null, //agentNotes_time_to_get_clean,
            personaIds      : ["Strategy-Focused Teacher",
                               "Strengths in Student Understanding Teacher",
                               "Struggles in Student Understanding Teacher"]
        },
        // ---- CS Problems ---- //
        {
            problemId       : "longest_common_subsequence",
            title           : "Longest Common Subsequence",
            text            : dedent`Given two strings of lowercase letters, write a function:

                string longestCommonSubsequence(string s1, string s2)

                that returns the longest common subsequence of both strings. Recall that a subsequence of a string is the same string, except that an arbitrary number of its characters have been removed, and the order of the characters that remain is preserved.

                Given the string "abcdefghijklmnop", each of the following is a subsequence: "djp", "aegjlp", "abcdefghijklmnop", "acdefhijklnp", "ehilnp", "aegjnp"

                Notice that all characters in the subsequences appear in the same order as in the original string.

                The objective of the problem is to find and return the longest subsequence that is shared by the input strings s1 and s2. If there are two or more such subsequences, the function can return any one of them.

                Examples:
                longestCommonSubsequence("cs106a", "Mehran") → "a"
                longestCommonSubsequence("cs106x", "Keith") → ""
                longestCommonSubsequence("", "hello") → ""
                longestCommonSubsequence("she sells", "seashells") → "sesells"

                Solution:
                string longestCommonSubsequence(string s1, string s2) {
                    if (s1.length() == 0 || s2.length() == 0) {
                        return "";
                    } else if (s1[0] == s2[0]) {
                        return s1[0] + longestCommonSubsequence(s1.substr(1), s2.substr(1));
                    } else {
                        string choice1 = longestCommonSubsequence(s1, s2.substr(1));
                        string choice2 = longestCommonSubsequence(s1.substr(1), s2);
                        if (choice1.length() >= choice2.length()) {
                            return choice1;
                        } else {
                            return choice2;
                        }
                    }
                }`,
            imageURL        : null,
            imageDescription: null,
            agentNotes      : "This is a CS198 Section Leader teaching interview problem. The candidate is expected to teach this recursive problem to CS106B students who just learned recursion. Evaluate their teaching ability, not just their technical knowledge. The solution uses three cases: (1) base case when either string is empty, (2) when first characters match — include and recurse on both tails, (3) when they don't match — try skipping from each string and take the longer result.",
            personaIds      : ["problem_decomposition_and_lesson_design",
                               "student_interaction_and_guided_discovery",
                               "communication_and_learning_environment",
                               "technical_accuracy_and_debugging"]
        },
        {
            problemId       : "hailstone_sequence",
            title           : "Hailstone Sequence",
            text            : `Douglas Hofstadter's Pulitzer-prize-winning book Gödel, Escher, Bach contains many interesting mathematical puzzles. In Chapter XII, Hofstadter mentions a wonderful problem:

Pick some positive integer and call it n.
If n is even, divide it by two.
If n is odd, multiply it by three and add one.
Continue this process until n is equal to one.

Here is an example:
Enter a number: 15
  *15 is odd, so I make 3n + 1: 46*
  *46 is even, so I take half: 23*
  *23 is odd, so I make 3n + 1: 70*
  *70 is even, so I take half: 35*
  *35 is odd, so I make 3n + 1: 106*
  *106 is even, so I take half: 53*
  *53 is odd, so I make 3n + 1: 160*
  *160 is even, so I take half: 80*
  *80 is even, so I take half: 40*
  *40 is even, so I take half: 20*
  *20 is even, so I take half: 10*
  *10 is even, so I take half: 5*
  *5 is odd, so I make 3n + 1: 16*
  *16 is even, so I take half: 8*
  *8 is even, so I take half: 4*
  *4 is even, so I take half: 2*
  *2 is even, so I take half: 1*

As you can see from this example, the numbers go up and down, but eventually — at least for all numbers that have ever been tried — come down to end in 1. Because of this analogy, this sequence of numbers is usually called the Hailstone sequence.

**Your Task:** Write a program that reads in a number from the user and then displays the Hailstone sequence for that number.

The fascinating thing about this problem is that no one has yet been able to prove that it always stops. This problem (often referred to in math as the Collatz Conjecture) is one of the most famous unsolved problems in math.`,
            imageURL        : null,
            imageDescription: null,
            agentNotes      : "This is a CS debugging problem. Students were asked to write a Python program that computes the Hailstone sequence for a given input. The correct solution uses a while loop with condition 'while n != 1', and inside the loop checks if n is even (divide by 2) or odd (multiply by 3 and add 1). Four student solutions are provided as transcripts, each containing different bugs. The candidate should evaluate the student code, identify bugs, and explain how to fix them in a teaching-oriented way.",
            personaIds      : ["problem_decomposition_and_lesson_design",
                               "student_interaction_and_guided_discovery",
                               "communication_and_learning_environment",
                               "technical_accuracy_and_debugging"]
        }
    ];

    for (const problem of problems) {
        // Idempotent
        // Can safely be run multiple times w/o throwing errors or duplicating data
        await prisma.problem.upsert({
            where: { problemId: problem.problemId },
            update: {
                // optional: update relations safely
                personas: {
                    set: [], // clear existing relations first
                    connect: problem.personaIds.map((id) => ({ personaId: id })),
                },
            },
            create: {
                problemId       : problem.problemId,
                title           : problem.title,
                imageURL        : problem.imageURL,
                imageDescription: problem.imageDescription,
                text            : problem.text,
                agentNotes      : problem.agentNotes,
                personas        : {
                    connect: problem.personaIds.map((id) => ({ personaId: id })),
                },
            },
        });
    }
    console.log("✅ Problems created");
          
    // ================================================================= //
    //        T    R    A    N    S    C    R    I    P    T    S        //
    // ================================================================= //
    // --------------------------------------------------------- //
    //    I  M  A  G  E     D  E  S  C  R  I  P  T  I  O  N  S   //
    // --------------------------------------------------------- //
    const imageDescription_number_trains_studentB = dedent`
          Student B has completed all problems on the worksheet, with extensive additional work and visual representations shown at the bottom.
          Problem 3 (Engine 24): Four trains are shown with factor pairs:
          • Train 1: 4 × 6
          • Train 2: 12 × 2
          • Train 3: 8 × 3
          • Train 4: 1 × 24
          
          Problem 4 (Engine 36):
          • Shows calculation work: 18 × 2 = 36
          • Listed four other factor pairs:
            (a) 1 × 36
            (b) 18 × 2 (teacher mark it with 'x' on the right-hand side, indicating the answer is wrong)
            (c) 6 × 6 
            (d) 4 × 9
            
          Additional work at the bottom: Student created extensive visual representations using circles and tally marks:
          • Left side: A cluster of six circles, each containing six tally marks, labeled with "6".
          • Bottom right:  A cluster of four circles, each containing nine tally marks, labeled with "9".
          • Upper right: A cluster of three circles — the top and right circles each contain eleven tally marks and are labeled with "11", while the middle circle contains twelve tally marks and is labeled "12".
          • Far right: An additional note showing "18 + 18 = 36"

          • Left side: A cluster showing groups of 6 (five circles each containing 6 tally marks, with "+4" notation)
          • Right side: Multiple circles containing groups of 4 tally marks arranged in patterns, with "9" written nearby
          • Various calculations: "12", "36", "7", "8" written in circles and margins
          `;
    
    // TODO: imageDescription_number_trains_studentC may change
    const imageDescription_number_trains_studentC = dedent`
          Student C has completed Problem 3 and Problem 4 on the worksheet.
          Problem 3 (Engine 24): Four trains are shown with factor pair attempts:
          • Train 1: 3 × 8 
          • Train 2: 2 and 14 with an X mark (incorrect - should be 2 and 12, instead of 14)
          • Train 3: 1 × 28 with an X mark (incorrect - should be 1 × 24, and 1 × 28 = 28, not 24)
          • Train 4: 4 and 6 
          
          Problem 4 (Engine 36):
          • Correctly identified engine number as 36
          Listed four factor pair attempts:
          The student changed the required format — the task only asks for two numbers multiplied, but the student added an equals sign by themselves, writing it as "36 = 2 × 18".
            (a) 36 = 2 × 18 with X marks (and the student repeated the given problem "36 = 2 × 18" instead of generating a new factor pair)
            (b) 24 = 3 × 8 with X marks (incorrect: 3 × 8 = 24, not 36)
            (c) 40 = 8 × 5 with X marks (incorrect: 8 × 5 = 40, not 36)
            (d) 8 = 8 × 1 with X marks (incorrect: 8 × 1 = 8, not 36)
          `;
    
    const imageDescription_symmetrical_pattern_studentD = dedent`
          For Part 1 (Naming Shapes), the student wrote: "triangle, rectangle, square and circles for the middle and everything is for the sides". It should be noted that the central shape is not a circle but a circle-like structure, and the description of the shapes' locations is not clear enough.
          For Part 2 (Drawing Lines of Symmetry), the student did not complete this part and there is no response.
          For Part 3, Student D completed the left half of the symmetrical pattern across the diagonal line of symmetry. However, the completed pattern shows significant differences from the given right side - the shapes are present but their sizes, positions, and relationships don't accurately mirror the original. They listed "triangle, rectangle" as the shapes in the pattern.
          `
    
    const imageDescription_symmetrical_pattern_studentE = dedent`
          Student E's work shows only Part 3 of the worksheet. Parts 1 and 2 are not visible in this image.
          For Part 3, the student attempted to complete the left half of the symmetrical pattern across the given diagonal line of symmetry. However, instead of creating a single cohesive mirror image, the student appears to have created a repeating pattern of small shapes (triangles, rectangles, squares) that wraps around what looks like a curved or irregular boundary. The shapes appear to repeat in a chain-like sequence rather than reflecting across the line of symmetry. They listed the shapes as "triangle, triangle, square, rectangle, triangle, square" - listing them in a sequential manner.
          `
    
    const imageDescription_winning_spinners_studentD = dedent`
          Student D's 4×4 table is filled with correct sums (e.g., 15,11,9,8 in row 7; 17,13,11,10 in row 9; 13,9,7,6 in row 5; 11,7,5,4 in row 3). In Question 2 the student writes 4 (ambiguous probability). ("x" is the teacher' remark of students' written sample, not written by students)
          
          For Question 3 (redesign), D draws two new spinners:
          • Left spinner contains 8, 9, 7, 5 (one even, three odds).
          • Right spinner contains 1, 2, 4, 3 (two evens, two odds).
          
          Student D claims a higher win chance and writes an explanation: "Because I added the numbers and I counted all the even numbers," plus a stray list of sums like "7+1; 5+1; 7+3 etc.".
          `
    
    const imageDescription_winning_spinners_studentΕ = dedent`
          Student E's 4×4 table is completed correctly and they mark the even totals (8, 10, 6, 4). For Question 2 they write "not likely."
          For Question 3, E draws two new spinners:
          • One spinner shows 9, 8, 7, 5 (one even, three odds).
          • The other shows 2, 4, 1, 3 (two evens, two odds).
          They describe their reasoning: they identified pairs that make even sums (8+2, 9+1, 7+3) and placed "one of each pair" on opposite spinners "so he would have a better chance of winning." They label the outcome as "very likely."
          `
    
    const imageDescription_time_to_get_clean_studentB = dedent`
          Student B writes: Question 1 "Dad," Question 2 "Carl." For Question 3 they record "1:25" and show (50+35=85) with side work including "60=1, 120=2, 60+20=80, 1:20+5=1:25." (this illustrates that student B understands 60 minutes=1 hour; 120 minutes=2 hour; 85 minutes = 1 hour + 20 minutes + 5minutes) Question 4 answer "10." For Question 5 they start at 6:00 and repeatedly add 30, 20, 45, 50, 35 (in some order), writing intermediate clock times "6:95," "7:80," then "7:80" as final.
          `
    
    const imageDescription_time_to_get_clean_studentC = dedent`
          Student C annotates conversions next to names in the table: writes "1/2 hour = 30 min" (correct) and "3/4 hour 40 min" (incorrect). Question 1 "Dad," Question 2 "Carl." Question 3 shows (50+35=85; 60+25=85) and records "1 hr 25 min." Question 4 "10 min." For Question 5 they list durations (30, 20, 40, 50, 35), total them to 175 min (because of the 40-minute error), then convert to "2 hr 55 min" and claim a finish time of "8:55 a.m."
          `
    
    // ------------------------------------ //
    //    A  G  E  N  T     N  O  T  E  S   //
    // ------------------------------------ //
    const agentNotes_number_trains_studentB = dedent`
          <Struggles in Student Understanding Teacher>
            Areas that Student Struggles:
            • The student misunderstood "Other". For example, in Problem 4, part (b): Listed (18 × 2) despite this being the given pair. The problem explicitly states: "List the OTHER 4 pairs of boxcar numbers that can be pulled by this engine." The pair (2, 18) was GIVEN in the problem - it's the starting information that students used to find the engine number. By listing (18 × 2) as one of their "other" pairs, Student B reveals:
            • Literal interpretation of commutativity: The student may have thought that because the given pair was written as (2, 18), writing it as (18, 2) makes it "different." This shows strong understanding that 2 × 18 = 18 × 2 (commutative property), possible misinterpretation of what "other" means in this context, and focus on the ORDER of numbers rather than the combination itself
            • Not fully processing the instruction: The student may have been so focused on finding factor pairs that they forgot this specific pair was already given, not recognized that "other" means "different combinations," not just "different order", and completed this mechanically without reflecting on the constraint
            • Contrast with other work: Interestingly, in Problem 3, the student DID understand "different" correctly - they didn't list (6, 4) and then (4, 6) as separate pairs. This suggests the error in Problem 4 might be more about the complexity of the two-step problem, losing track of what was already given while focusing on finding factor pairs, or not carefully rereading the specific constraints of Problem 4
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            Student B uses various math strategies when solving these problems; these strategies mainly manifest in Problem 4 (Engine 36).
            • Factor-Pair Listing (Systematic Search): 
              Strategy meaning: Listing pairs of integers whose product is the target (36). Evidence:
              The completed pairs on the lines—1×36, 18×2, 6×6, 4×9—show a deliberate sweep through factor pairs rather than random guesses.  Impact: ensurea the coverage of likely factors and avoids duplicates.
            • Equal-Groups Representation (Concrete Modeling):
              Strategy meaning: Drawing groups with tallies to model multiplication as "groups of." Evidence: Bottom left: six circles with six tallies each, models 6×6=36. Bottom right: four circles with nine tallies each. models 4×9=36. Impact: Confirms that a proposed factor pair actually yields 36 by counting.
            • Integration of Numbers and Visual Representation:
              Strategy meaning: combines numerical reasoning with visual modeling, using diagrams to concretize multiplication and factor relationships. Evidence: The student drew groups of circles with tally marks—six circles with six tallies, four circles with nine tallies, and three circles with mixed quantities (two labeled "11" and one labeled "12"). These drawings visually represent different ways to compose 36, turning abstract multiplication into visible group structures. Impact: This approach helps the student connect symbolic multiplication (e.g., 6×6, 4×9) with concrete, countable quantities, showing a strong grasp of part-whole relationships.
            • Skip-Counting / Repeated Addition:
              Strategy meaning: Counting by a factor to reach the product. Evidence: The four "9" groups imply counting 9, 18, 27, 36; the six "6" groups imply 6, 12, 18, 24, 30, 36. Impact: Efficient verification without full multiplication algorithms.
            • Commutative Awareness:
              Strategy meaning: Knowing a×b = b×a, so either order is valid. Evidence: Factor pairs are recorded in various orders (e.g., 18×2 alongside 1×36, 4×9), with no attempt to list mirror pairs as new facts. Impact: Reduces redundant work and supports a cleaner, unique list of factor pairs.
            • Horizontal Multiplication (Place-Value Decomposition):
              Strategy meaning: Computing by breaking down numbers by place value, multiplying ones and tens separately. Evidence: For 2×18, the student appears to have multiplied the ones and tens digits independently, likely computing 2×8=16 and 2×10=20, then adding 16+20=36. Impact: This suggests an understanding of distributive property and base-ten structure, showing procedural fluency grounded in conceptual understanding.
            • Re-unitizing / Regrouping:
              Strategy meaning: Seeing 36 as different partitions into equal groups (e.g., 6 groups of 6 vs. 4 groups of 9). Evidence: The two correct visual models (6×6 and 4×9) represent the same total re-unitized with different group sizes. Impact: Builds multiplicative flexibility and number sense around 36.
            • Conjecture–Test–Revise (Self-Monitoring/Trial and Adjustment/Exploratory Reasoning):
              Strategy meaning: Trying a possibility, checking it, and adjusting if it doesn't fit. Evidence: Upper right cluster with labels 11, 12, 11 (two circles marked "11," one "12") suggests an exploratory attempt that does not total 36 via equal groups. Impact: Shows the student validating ideas against the target and correcting course.
            • Multi-Representational Strategy (Multiple Representation Strategy/Strategy Coordination)
              Strategy Meaning: The student flexibly moves between different forms of representation — visual (drawings), symbolic (multiplication), and numerical (addition). Evidence:
              Drawings: Used circles and tally marks to represent equal groups. Addition: Wrote "18 + 18 = 36" to verify 2×18. Multiplication: Listed equations like 6×6 and 4×9 to find factor pairs. Impact: This shows the student can connect visual, additive, and multiplicative reasoning—an indicator of deep understanding.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Complete and correct factor pairs for 24: Student B found all four main factor pairs for 24: (4, 6), (12, 2), (8, 3), and (1, 24). This demonstrates: students' solid understanding of the multiplication-factors relationship; ability to find multiple different factor combinations; with no duplicate pairs, it shows that they understood "different" means different factor combinations
            • Correct engine number identification: For Problem 4, the student correctly calculated that 2 × 18 = 36, showing clear work for this step.
            • Found the special square factor pair: Student B identified (6, 6) as a factor pair for 36, which is mathematically sophisticated. Many students miss this because both factors are the same number. Finding this shows:
                (a) Strong understanding that a number can be multiplied by itself
                (b) Recognition of 36 as a perfect square
                (c) Ability to think beyond the "two different numbers" pattern
            • Visual/concrete problem-solving approach: Meanwhile, the extensive tally mark work at the bottom is mathematically fascinating:
            Left cluster (groups of 6):
            • Five circles each with 6 tally marks = 5 × 6 = 30
            • "+4" notation suggests 30 + 6 = 36
            • This appears to be the student working out 6 × 6 = 36, possibly:
                (a) Using 5 × 6 = 30 as a known fact
                (b) Then adding one more 6 to get 36
                (c) This is a sophisticated strategy showing understanding of distributive property: 6 × 6 = (5 × 6) + (1 × 6)
            
            Right side (groups of 4):
            • Multiple circles with 4 tally marks
            • Number "9" nearby
            • This appears to be working out 4 × 9 = 36
            • Counting by 4s nine times to verify this factor pair
            
            The extensive work at the bottom with circles and tally marks reveals that this student:
            • Uses visual-spatial strategies to understand multiplication
            • Creates concrete representations (groups of objects) to verify or think through factor relationships
            • May be using skip-counting or repeated addition to understand multiplication
            • Shows persistence and deep engagement with the mathematics
            • Self-checking behavior: The presence of check marks suggests the student is reviewing or confirming their answers, showing metacognitive awareness.
          </Strengths in Student Understanding Teacher>
          `
    const agentNotes_number_trains_studentC = dedent`
          <Struggles in Student Understanding Teacher>
            Major Struggles - Division Notation in Multiplication Problem:
            The most striking feature of Student C's work is the persistent use of division symbols (÷) in a multiplication problem. Looking at Problem 4:
              (a) 36 = 2 × 18
              (b) 24 = 3 × 8
              (c) 40 = 8 × 5
              (d) 8 = 8 × 1
            
            What this reveals:
            Fundamental operation confusion: The student appears to be confusing division with the relationship being tested (multiplication/factors). Several interpretations are possible:
            Interpretation A - Misunderstanding the task format:
            • The student may think they need to show that the numbers divide evenly
            • They might be thinking: "Does 2 divide into 36? Yes, so I'll write 36 ÷ 2"
            • But then they're unclear about how to complete the expression
          
            Interpretation B - Checking divisibility:
            • The student might be using division to CHECK if numbers are factors
            • For example, "36 ÷ 2 = 18, so 2 and 18 work"
            • This would show good mathematical thinking (using division to verify factors) but incorrect notation for answering the question
            
            Interpretation C - Mixed operation confusion:
            • The student may be genuinely confused about when to use ×, ÷, =, and other symbols
            • The presence of multiple symbols in each response suggests uncertainty about mathematical notation
            
            What Student C Seems to Understand:
            • Multiplication connects two numbers to make a product (some evidence)
            • There's a relationship between numbers in these problems
            • Division and multiplication are somehow related (they are inverse operations, but student is confused about how)
            
            What Student C Struggles With:
            • Systematically finding factors: No evidence of systematic strategy (trying 1, 2, 3... to see what divides evenly)
            • Maintaining the target number: Keeps losing track of whether they're finding factors of 24, 36, or other numbers
            • Mathematical notation: Confusing when to use ×, ÷, and =
            • Verification: Not checking their work (3 × 8 = 24, not 36, which could be caught by calculating)
            Factor vs. product relationship: May not fully grasp that factors MULTIPLY to give the product
            
            Student C demonstrates significant conceptual confusion about factors, operations, and mathematical notation. The use of division symbols in a multiplication problem, combined with choosing number pairs that don't multiply to the target, suggests this student needs substantial re-teaching of foundational concepts about factors and multiplication relationships. The errors are systematic rather than careless, indicating conceptual gaps rather than simple mistakes. With appropriate concrete, scaffolded instruction, this student can build understanding, but they're currently not ready for independent work at this level of abstraction.
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            • Basic Multiplicative Reasoning: Strategy Meaning: The student understands that the engine number equals the product of the two boxcars. Evidence: Correctly computed 2×18 = 36 for the second problem. Impact: Demonstrates awareness of multiplication as repeated groups but not yet flexible factorization.
            • Developing Factor Reasoning (Procedural with Factual Recall): Strategy Meaning: The student grasps that factors form a product via multiplication facts but relies on procedural steps and partial recall, lacking strategic flexibility. Evidence: Correctly identified factor pairs of 24 (3×8, 4×6) and product of 2×18 (36), yet made errors like 24=2×14, showing incomplete conceptual mastery. Impact: Demonstrates emerging fluency in basic factor identification but needs practice to transition from rote recall to strategic, systematic reasoning.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Correct engine number identification: Student C successfully determined that 2 × 18 = 36 in Problem 4, showing they understood the first step of the two-part problem and can multiply two-digit numbers.
            • One fully correct factor pair: In Problem 3, the student correctly identified (3, 8) as a factor pair for 24, demonstrating that they understand the basic concept that factors multiply to produce the target number.
            • Attempted all parts: The student engaged with the entire problem set and provided answers for all sections, showing effort and persistence even when struggling.
          </Strengths in Student Understanding Teacher>
          `
    
    const agentNotes_symmetrical_pattern_studentD = dedent`
          <Struggles in Student Understanding Teacher>
            Struggles:
            Part 1 - Shape Identification Errors:
            • "Circles for the middle": The student identified the central octagon as "circles," revealing confusion between curved shapes (circles) and multi-sided polygons (octagons). This is a common developmental misunderstanding where any rounded or multi-sided shape may be called a "circle."
            • Unclear shape-location description: The phrase "everything is for the sides" is ambiguous and doesn't clearly communicate which shapes are where, suggesting the student struggles to articulate geometric relationships precisely.
            
            Part 2 - Unattempted Lines of Symmetry Drawing Task
            • The student did not complete the second question (drawing lines of symmetry). While the reason (e.g., overlooking the task, lacking confidence in symmetry concepts) is unclear, the omission indicates a struggle with either task awareness or applying the symmetry concept to identify and draw valid lines of symmetry.
            
            Part 3 - Reflection/Symmetry Application Difficulties:
            • Inaccurate mirroring: The most significant struggle appears in Part 3. While Student D attempted to complete the pattern, the reflected shapes don't accurately mirror the given right side. The shapes are approximately in the correct regions but their sizes, proportions, and precise positions don't show true reflection symmetry.
            • Possible interpretation: The student may have understood they needed to "draw something on the other side" but didn't grasp that symmetry requires EXACT mirror imaging - that every shape, angle, and distance must be precisely reflected across the line. This suggests the student may be thinking of symmetry more as "having shapes on both sides" or "balance" rather than as precise geometric reflection.
            • Pattern of Understanding: Student D shows emerging awareness of geometric concepts but struggles with precision and exact definitions. They recognize that: Patterns contain shapes (but may confuse which specific shapes); Symmetry involves some kind of division or "two-sidedness" (but may not understand precise reflection); Patterns can be described spatially (but struggle to articulate this clearly)
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            • Attempted Operational Strategy for Completing Symmetrical Patterns. Strategy Meaning:	Guided by the basic rule of symmetrical mirror images across the axis, the student uses intuitive perception to draw the other half, representing a preliminary attempt to apply symmetry concepts through active engagement. Evidence: For Question 3 (symmetrical pattern completion), the student actively drew the left side of the symmetry axis instead of leaving it blank, showing awareness of following symmetry rules. Impact: Despite errors in size, position and details (due to insufficient understanding of mirror congruence), the active attempt reflects initial awareness of applying symmetry concepts to practice, laying a foundation for mastering symmetrical transformation and spatial reasoning.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Attempted complete engagement: Student D made attempts at all three parts of the task, showing persistence and willingness to engage with all aspects of the problem.
            • Spatial and descriptive thinking: In Part 1, the student went beyond just listing shape names and tried to describe WHERE shapes are located ("circles for the middle and everything is for the sides"). This shows emerging spatial reasoning and an attempt to describe the pattern's organization, even though the description has inaccuracies.
            • Shape vocabulary recognition: The student used geometric vocabulary including triangle, rectangle, and square, showing familiarity with these terms.
            • Strong awareness of active participation and task attempt: Although Question 2 was incomplete, the student did not leave Question 3 (completing the symmetrical pattern) blank. Instead, the student took the initiative to draw the other side of the line of symmetry. This "never-give-up, active hands-on practice" attitude serves as a crucial foundation for mathematical exploration and skill improvement, making it a notable strength.
            • Preliminary awareness of extended spatial description: The question only required naming shapes, but the student proactively attempted to describe the spatial positions of the shapes (e.g., "circles for the middle" and "everything is for the sides"). While this behavior exceeded the question's requirements and lacked precision, it reflects the student's willingness to go beyond basic tasks and engage in associative thinking of "shapes and spatial positions" — a potential strength in the development of spatial thinking.
            • Proficient basic Shape recognition and naming: The student accurately identified and listed fundamental shapes in the pattern, such as triangles, rectangles, and squares. Only the central octagon structure was inaccurately described as a "circle" (a wording deviation rather than an error in recognizing shape properties). This indicates mastery of the core attributes of common shapes and solid foundational shape cognition.
          </Strengths in Student Understanding Teacher>
          `
    
    const agentNotes_symmetrical_pattern_studentE = dedent`
          <Struggles in Student Understanding Teacher>
            • Significant Conceptual Confusion - Symmetry vs. Repeating Patterns:
              The core issue is that Student E appears to have confused LINE SYMMETRY with REPEATING/TRANSLATIONAL PATTERNS:
              (1) Creating a border/chain rather than reflection: Instead of mirroring the given shapes across the line of symmetry to create one cohesive left half, the student created a chain or border of repeating shapes that wraps around a curved boundary. This suggests they interpreted "pattern" in the everyday sense (something that repeats) rather than the geometric sense (something symmetrical).
              (2) Sequential thinking vs. mirror thinking: The way they listed shapes ("triangle, triangle, square, rectangle, triangle, square") reveals sequential/counting thinking - as if reading shapes in order around a border. This is fundamentally different from symmetry thinking, which requires imagining what each shape would look like reflected across a line.
              (3) Local shape focus vs. whole-pattern reflection: The student seems to have focused on individual shapes from the given side and thought "I need triangles and rectangles over here too" rather than thinking "I need to reflect THIS ENTIRE configuration across the line so the left side is a mirror image of the right side."
              
            • Additional Evidence of Struggle:
              (1) Curved boundary: The overall shape created doesn't maintain the angular, geometric character of the given half-pattern. This suggests the student wasn't attending to the overall structure that needed to be reflected.
              (2) Shape distribution: Rather than having shapes in corresponding positions that mirror across the line, the shapes seem randomly or decoratively distributed around a border.
              
            • What This Reveals About Student Thinking: This is a classic and valuable example of a student who:
              (1) Has been exposed to the WORD "pattern" but hasn't yet differentiated between different types of patterns (repeating, growing, symmetrical)
              (2) May have strong intuitive understanding of repetition and decorative patterns but hasn't yet grasped reflection symmetry as a specific mathematical concept
              (3) Is actively trying to make sense of the task but is using an incorrect schema (repetition) to interpret it
              
            • Why This Happened: The instruction says, "Draw the other half of her pattern" - and the student focused on the word "PATTERN." In everyday language, "pattern" often means "repeated design" (like wallpaper, fabric patterns, border designs). The student may have thought: "I need to make a pattern, and patterns repeat, so I'll repeat these shapes."
            
            • Important Note for Agent/Teacher: When working with Student E, it's crucial NOT to say "this is completely wrong" but rather to recognize this as a meaningful attempt that reveals logical thinking based on a common misconception. The student is demonstrating pattern-thinking skills - just applying the wrong TYPE of pattern. This makes it a perfect teaching moment to distinguish between different pattern types and to explicitly teach reflection symmetry as a specific, precise mathematical concept.
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Attempted Symmetry-Driven Pattern Completion
            Strategy Meaning: Attempts to complete a symmetrical pattern by leveraging the concept of a line of symmetry, aiming to create a mirror image of the given half, despite drawing inaccuracies. Evidence: Actively draws on the other side of the line of symmetry, showing awareness of the need for mirroring in symmetrical patterns, even though the drawn shapes do not perfectly match the original. Impact: Reflects an effort to apply symmetry concepts to practical tasks. While precision is lacking, the attempt builds a foundation for improving spatial reasoning and accurate execution of symmetrical transformations.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            • Partial Understanding - What Student E DOES Grasp:
              (1) Pattern awareness: The student recognized that the task involves creating some kind of pattern and attempted to work systematically
              (2) Shape identification: They can identify and name basic shapes (triangles, rectangles, squares), as evidenced by their written list
              (3) Repetition: The student understands that patterns can involve repeating elements
              (4) Attention to the given shapes: They appear to have looked at the shapes on the right side and attempted to incorporate similar shapes into their response
          </Strengths in Student Understanding Teacher>
          `
    
    const agentNotes_winning_spinners_studentD = dedent`
          <Struggles in Student Understanding Teacher>
            Partial understandings
            • Probability statement is unclear. The student seems to have counted four winning outcomes but didn't express the probability: it should be 4/16 = 1/4 = 25%.
            • The explanation states "I counted all the even numbers," but does not articulate why the 2-and-1 split of evens maximizes wins (i.e., it maximizes "both even" plus "both odd" outcomes).
            • Although the student listed some even-sum pairs (7+1, 7+3, 5+3, 8+2), they omitted 9+3 and 9+1, which are also even. The student's counting is on the right track but not yet comprehensive and systematic.
            • Communication gap: The method for Question 2 is implicit rather than explicit. The student likely "saw four evens" in the grid but didn't convert to probability notation.
            • Missing quantitative conclusion in Question 3: They improved the design but didn't compute the new probability (should be (8/16=1/2)).
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            • Probability Calculation Attempt Strategy: For problem 3, the student actively attempts to calculate probability by combining addition operations with "counting even numbers". This not only demonstrates the willingness to explore probability problems but also tries to quantify the possibility of events using their own logic (counting even numbers). It is a preliminary exploration of probability concepts from cognition to practice. Although there are calculation deviations in the process, this proactive problem-solving thinking lays a foundation for accurately mastering probability calculation in the future.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Accurate computation: The table is correct—evidence of careful enumeration.
            • Sensible optimization move: The new spinners split the three even numbers as 1 even on one spinner and 2 evens on the other, which is optimal. This yields 8 even outcomes out of 16, so the probability of landing an even product is 1/2. The layout (“one-even/three-odd” vs “two-even/two-odd” is ideal.
          </Strengths in Student Understanding Teacher>
          `
    
    const agentNotes_winning_spinners_studentΕ = dedent`
          <Struggles in Student Understanding Teacher>
            Partial understandings
            • Qualitative probability language only ("not likely," "very likely")—they sense the shift from (1/4) to (1/2) but don't compute it numerically.
            
            Struggles
            • Missing numeric probability: The new best-possible probability is (1/2); "very likely" may overstate it.
            • Pair focus can obscure full counting: While naming a few even-making pairs is insightful, students may forget there are 16 equally likely pairs; the optimization must improve the count of even outcomes across all 16.
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            • Clarify the winning rule of "the sum of two numbers is even" and identify the number pairs that meet this condition (8&2, 7&3, 9&1). Place the two numbers of each pair on two different spinners respectively, and increase the winning probability by adjusting the distribution of numbers on the spinners—this is a straightforward approach. Try to express the thinking process and explain why the spinners are designed this way, showing willingness to actively sort out the problem-solving logic.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Correct table and correct identification of even-sum cells—clear grasp of parity results in a grid.
            • Strategic redesign: Like Student D, E uses the optimal split (2 evens on one spinner, 1 even on the other). That maximizes even outcomes to (8/16=1/2).
            • Emerging structural thinking: E names concrete complementary pairs (e.g., 9+1, 7+3, 8+2) to justify the cross-spinner placement—evidence of reasoning beyond guess-and-check.
          </Strengths in Student Understanding Teacher>
          `
    
    const agentNotes_time_to_get_clean_studentB = dedent`
          <Struggles in Student Understanding Teacher>
            Difficulties & errors (with evidence):
            • Clock-time notation for duration (Ambiguous colon time): Writing "1:25" is clock-time style and ambiguous for a duration. Student B should write "1 hr 25 min" (or just "85 min") to make the units explicit.
            • Regrouping minutes: In Question 5 they create times like 6:95 and 7:80, showing they add minutes arithmetically but do not convert 60 minutes into an additional hour. This is a classic place-value regrouping issue for time. Student B conflates base-10 arithmetic with time's base-60 system—treating minutes as if they regroup at 100 instead of 60. 
            • Units omission: Question 4 "10" lacks "minutes," suggesting an incomplete statement of units, even though the computation (30-20) is correct.
            • Standardized math note: "1:20 + 5 = 1:25" is not standard for duration and can be misread as clock time. Use unit-labeled notation: 1 hr 20 min + 5 min = 1 hr 25 min (or 80 min + 5 min = 85 min = 1 hr 25 min). In math, clear, unit-explicit expressions prevent ambiguity.
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            • Time Comparison & Screening Strategy: The student accurately identifies that Dad spends the most time and Carl spends the shortest time in the bathroom by comparing the given time data, demonstrating a clear grasp of "longest" and "shortest" concepts and effective data screening ability.
            • Time Addition Strategy: For problem 3, the student attempts to add Dad's 50 minutes and Grandpa's 35 minutes. They show computations like \( 50 + 35 = 85 \), \( 60 = 1 \) (converting 60 minutes to 1 hour), \( 120 = 2 \) (incorrect conversion attempt), and \( 60 + 20 + 5 = 85 \) (with an incorrect time format \( 1:25 \) as the result). This reflects the student's awareness of adding time durations, even though there are errors in unit conversion and result formatting.
            • Time Difference Calculation Strategy: In problem 4, the student correctly uses subtraction \( 30 - 20 = 10 \) to find the time difference between Megan and Carl. Megan's time is \( \frac{1}{2} \) hour (30 minutes) and Carl's is 20 minutes, so the student's reasoning here is logically sound.
            • Time Sequence Reasoning Strategy (Running Clock Addition Method): For problem 5, the student tries to calculate the end time by incrementally adding durations to the start time (6 a.m.) with the durations of all users. They show computations like \( 6:00 + 30 + 20 + 45 = 6:95 \) (incorrect), \( 6:95 + 50 + 35 = 7:80 \) (incorrect time format). This indicates the student's attempt to apply the logic of "adding time sequences to derive the end time" using a running clock addition method, though there are mistakes in time unit conversion and formatting.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Correct identifications for longest (Dad) and shortest (Carl).
            • For Question 3, Student B reaches the correct duration (1 hr 25 mins) by decomposing 85 into “60 + 20 + 5.” They recognize that 85 minutes exceeds an hour and represent it as "1:25."
          </Strengths in Student Understanding Teacher>
          `
    
    const agentNotes_time_to_get_clean_studentC = dedent`
          <Struggles in Student Understanding Teacher>
            Struggles:
            • Fraction-minute conversion error: Interprets 3/4 hr as 40 minutes; correct is 45 minutes. This single conversion slip propagates to Question 5: total becomes 175 min instead of 180 min, leading to finish time 8:55 a.m. instead of 9:00 a.m.
            • Minor reliance on “60 + 25 = 85” in Question 3 suggests they know to decompose minutes around 60; this is a strength, but consistency in conversions is the gap.
          </Struggles in Student Understanding Teacher>
          
          <Strategy-Focused Teacher>
            Mathematical Strategies:
            • Transparent strategy: Converts each person's time to minutes, sums, then converts total minutes back to hours: minutes. The writings under 3., 4. and 5. show more of their strategies - that is, the computations they used that made up their solution path (adding 50 and 35, adding 60 and 25) adding a series of minutes, etc. These descriptions are useful to explain how the student reached their answer. It is a sound methodology.
            • Benchmarking + regrouping: Student C leans on the 60-minute benchmark (e.g., totaling to 175 min to 2 hr 55 min) and fluently rewrites minutes to hours. That's robust place-value reasoning for time.
          </Strategy-Focused Teacher>
          
          <Strengths in Student Understanding Teacher>
            Mathematical Strengths:
            • Clear and coherent problem-solving logic: Follows a complete thinking path of "understanding the question, targeted calculation, unit conversion, and deriving the answer". Especially in Question 5, independently designs the solution route of "unifying units (converting to minutes), summing up, converting back to hours: minutes", showing organized thinking.
            • Solid core time calculation skills: Duration comparison (identifying longest/shortest), time addition (50+35=85), and time difference calculation (30-20=10) are all accurate, reflecting proficient mastery of basic time calculation rules.
            • Correct unit conversion method: Uses the benchmark of "60 minutes = 1 hour" for conversion (e.g., 85 minutes = 1 hour 25 minutes, 175 minutes = 2 hours 55 minutes). The conversion logic and steps are correct, with only a single numerical calculation error.
            • Data processing and verification awareness: In Question 3, verifies the result through two-way calculations of "50+35=85" and "60+25=85", demonstrating rigor in proactively checking answers and a flexible understanding of time unit decomposition.
          </Strengths in Student Understanding Teacher>
          `
    
    const transcripts = [
        {
            problemId       : "number_trains",
            text            : null,
            imageURL        : "/images/transcripts/math/number_trains_studentB.png",
            imageDescription: imageDescription_number_trains_studentB,
            agentNotes      : null, //agentNotes_number_trains_studentB,
        },
        {
            problemId       : "number_trains",
            text            : null,
            imageURL        : "/images/transcripts/math/number_trains_studentC.png",
            imageDescription: imageDescription_number_trains_studentC,
            agentNotes      : null, //agentNotes_number_trains_studentC,
        },
        {
            problemId       : "symmetrical_patterns",
            text            : null,
            imageURL        : "/images/transcripts/math/symmetrical_patterns_studentD.png",
            imageDescription: imageDescription_symmetrical_pattern_studentD,
            agentNotes      : null, //agentNotes_symmetrical_pattern_studentD,
        },
        {
            problemId       : "symmetrical_patterns",
            text            : null,
            imageURL        : "/images/transcripts/math/symmetrical_patterns_studentE.png",
            imageDescription: imageDescription_symmetrical_pattern_studentE,
            agentNotes      : null, //agentNotes_symmetrical_pattern_studentE,
        },
        {
            problemId       : "winning_spinners",
            text            : null,
            imageURL        : "/images/transcripts/math/winning_spinners_studentD.png",
            imageDescription: imageDescription_winning_spinners_studentD,
            agentNotes      : null, //agentNotes_winning_spinners_studentD,
        },
        {
            problemId       : "winning_spinners",
            text            : null,
            imageURL        : "/images/transcripts/math/winning_spinners_studentE.png",
            imageDescription: imageDescription_winning_spinners_studentΕ,
            agentNotes      : null, //agentNotes_winning_spinners_studentΕ,
        },
        {
            problemId       : "time_to_get_clean",
            text            : null,
            imageURL        : "/images/transcripts/math/time_to_get_clean_studentB.png",
            imageDescription: imageDescription_time_to_get_clean_studentB,
            agentNotes      : null, //agentNotes_time_to_get_clean_studentB,
        },
        {
            problemId       : "time_to_get_clean",
            text            : null,
            imageURL        : "/images/transcripts/math/time_to_get_clean_studentC.png",
            imageDescription: imageDescription_time_to_get_clean_studentC,
            agentNotes      : null, //agentNotes_time_to_get_clean_studentC,
        },
        // ---- CS Transcripts: Hailstone Sequence ---- //
        {
            problemId       : "hailstone_sequence",
            text            : `Student Solution - Example 1:

\`\`\`python
n = int(input("Enter a number: "))
count = 1
while count <= n:
    if n % 2 == 0:
        n = n // 2
        print(n)
    else:
        n = 3 * n + 1
        print(n)
    count += 1
\`\`\``,
            imageURL        : null,
            imageDescription: null,
            agentNotes      : `Bug analysis for Example 1:
- The loop condition 'while count <= n' is incorrect. The variable 'n' changes every iteration (it's the hailstone value being computed), so using it as the loop bound makes the loop terminate unpredictably. The loop should continue 'while n != 1' instead.
- The counter variable 'count' is unnecessary for the basic hailstone sequence — the loop should be driven by the value of n reaching 1.
- The student does not print the initial value of n before entering the loop.
- The logic inside the loop (even/odd checks and transformations) is correct.
- This is a conceptual error about loop control — the student conflated "counting steps" with "checking the termination condition."`,
        },
        {
            problemId       : "hailstone_sequence",
            text            : `Student Solution - Example 2:

\`\`\`python
n = int(input("Enter a number: "))
if n % 2 == 0:
    n = n // 2
    print(n)
else:
    n = 3 * n + 1
    print(n)
\`\`\``,
            imageURL        : null,
            imageDescription: null,
            agentNotes      : `Bug analysis for Example 2:
- There is no loop at all. The student only performs one step of the hailstone sequence using a single if/else, then the program ends.
- The even/odd logic is correct for a single step, but the program needs to repeat until n equals 1.
- The student likely understands the conditional logic but does not yet understand that a while loop is needed to repeat the process.
- This is a fundamental structural error — missing iteration entirely.
- The student does not print the initial value of n.`,
        },
        {
            problemId       : "hailstone_sequence",
            text            : `Student Solution - Example 3:

\`\`\`python
n = int(input("Enter a number: "))
while n % 2 != 0:
    n = 3 * n + 1
    print(n)
    if n % 2 == 0:
        n = n // 2
        print(n)
\`\`\``,
            imageURL        : null,
            imageDescription: null,
            agentNotes      : `Bug analysis for Example 3:
- The while loop condition 'while n % 2 != 0' only runs when n is odd. If the initial input is even, the loop never executes at all.
- The nested if inside the while handles the even case, but only once per odd iteration — it doesn't continue the sequence properly.
- The loop will exit as soon as n becomes even after the inner if executes, because the while condition checks odd only.
- The student seems to understand both transformations but has structured the loop incorrectly — they nested the even case inside the odd case instead of using a single loop with both branches.
- The correct approach is 'while n != 1' with if/else for even/odd inside.
- The student does not print the initial value of n.`,
        },
        {
            problemId       : "hailstone_sequence",
            text            : `Student Solution - Example 4:

\`\`\`python
n = int(input("Enter a number: "))
if n == 7:
    print(7)
    print(22)
    print(11)
    print(34)
    print(17)
    print(52)
    print(26)
    print(13)
    print(40)
    print(20)
    print(10)
    print(5)
    print(16)
    print(8)
    print(4)
    print(2)
    print(1)
\`\`\``,
            imageURL        : null,
            imageDescription: null,
            agentNotes      : `Bug analysis for Example 4:
- This is a hardcoded solution that only works for the input 7. It prints the correct hailstone sequence for n=7 but fails for every other input.
- There is no loop and no computation — the student manually traced the sequence and hardcoded each print statement.
- For any input other than 7, the program does nothing (no output).
- This reveals a fundamental misunderstanding of generalization — the student can trace the algorithm by hand but cannot translate it into a general program.
- This is a common beginner mistake: solving one specific case instead of writing a general solution.
- Good teaching opportunity: ask the student what happens if the input is 15, or 27, to help them see why hardcoding doesn't work.`,
        }
    ]
    
    // Create transcripts
    for (const transcript of transcripts) {
        const existingTranscript = await prisma.transcript.findFirst({
            where: {
                problemId: transcript.problemId,
                ...(transcript.imageURL ? { imageURL: transcript.imageURL } : {}),
            },
        });
        
        if (existingTranscript) {
            await prisma.transcript.update({
                where: { id: existingTranscript.id },
                data: {
                    text    : transcript.text,
                    imageURL: transcript.imageURL ?? null,
                },
            });
        }
        else {
            await prisma.transcript.create({
                data: {
                    text            : transcript.text,
                    imageURL        : transcript.imageURL ?? null,
                    imageDescription: transcript.imageDescription ?? null,
                    agentNotes      : transcript.agentNotes ?? null,
                    problem         : { connect: { problemId: transcript.problemId } },
                },
            });
        }
    }
    console.log("✅ Transcripts created");
    
    // ------------------------------------------ //
    //    C  H  A  T     T  E  M  P  L  A  T  E   //
    // ------------------------------------------ //
    // Create a ChatTemplate with specific problems
    const problemIds = [
        "meet-the-agents_peer_interaction_teacher",
        "meet-the-agents_strategy-focused_teacher",
        "meet-the-agents_strengths_in_student_understanding_teacher",
        "meet-the-agents_struggles_in_student_understanding_teacher",
        "number_trains",
        "symmetrical_patterns",
        "winning_spinners",
        "time_to_get_clean"
    ];
    
    // Create the template first
    const chatTemplate = await prisma.chatTemplate.create({
        data: {
            name        : "Math Concepts Template",
            categoryName: "math",
        },
    });
    
    for (const [index, problemId] of problemIds.entries()) {
        const problem = await prisma.problem.findFirst({
            where: { problemId: problemId },
        });
        if (!problem) {
            continue;
        }

        // Link each problemId to the template with order preserved
        await prisma.chatTemplateProblem.create({
            data: {
                chatTemplateId: chatTemplate.id,
                problemId     : problemId,
                order         : index, // preserve order
            },
        });
    }
    console.log("✅ Math ChatTemplate created");

    // CS Chat Template
    const csProblemIds = [
        "meet-the-agents_problem_decomposition_and_lesson_design",
        "meet-the-agents_student_interaction_and_guided_discovery",
        "meet-the-agents_communication_and_learning_environment",
        "meet-the-agents_technical_accuracy_and_debugging",
        "longest_common_subsequence",
        "hailstone_sequence"
    ];

    const csChatTemplate = await prisma.chatTemplate.create({
        data: {
            name        : "CS Concepts Template",
            categoryName: "cs",
        },
    });

    for (const [index, problemId] of csProblemIds.entries()) {
        const problem = await prisma.problem.findFirst({
            where: { problemId: problemId },
        });
        if (!problem) {
            continue;
        }

        await prisma.chatTemplateProblem.create({
            data: {
                chatTemplateId: csChatTemplate.id,
                problemId     : problemId,
                order         : index,
            },
        });
    }
    console.log("✅ CS ChatTemplate created");
    
    // --------------------------- //
    //    S  E  T  T  I  N  G  S   //
    // --------------------------- //
    await prisma.settings.create({
        data: {
            global_instructions    : "Always end with a relevant question that reflects the user's input and aligns with the current topic.",
            categoryName           : null,
            registerAsAdminPassword: null,
            switches: {
                create: [
                    {
                        isEnabled          : true,
                        isMutualExclusive  : true,
                        selectedOptionIndex: 2, // Selects option2 (Most Relevant Agent)
                        option1_label      : "Fixed Agent",
                        option1            : "An agent responds to the user three times before switching to a new agent.",
                        option2_label      : "Most Relevant Agent",
                        option2            : "The most contextually relevant agent is selected for each response.",
                    }
                    /*
                    {
                        isEnabled        : true,
                        isMutualExclusive: true,
                        option1_label    : "Neutral",
                        option1          : "Stay objective and avoid taking sides unless you genuinely agree or disagree with the user's point.",
                        option2_label    : "Supportive",
                        option2          : "Offer reassurance and motivate the user to keep going with their analysis.",
                        option3_label    : "Confrontational",
                        option3          : "Question or challenge the user's statements assertively.",
                        option4_label    : undefined,
                        option4          : undefined,
                        option5_label    : undefined,
                        option5          : undefined,
                    },
                    {
                        isEnabled        : true,
                        isMutualExclusive: false,
                        option1_label    : "Revoicing",
                        option1          : "Rephrase what the user mentioned and check in to see that you understood the user correctly.",
                        option2_label    : "Curiosity",
                        option2          : "Orient to what the user said with deep curiosity.",
                        option3_label    : undefined,
                        option3          : undefined,
                        option4_label    : undefined,
                        option4          : undefined,
                        option5_label    : undefined,
                        option5          : undefined,
                    }
                    */
                ]
            }
        }
      });
      console.log("✅ Settings created");
}

/**
 * Dedents a tagged template literal by removing the common leading spaces
 * from all non-empty lines.
 *
 * Example usage:
 * ```ts
 * const name = "Alice";
 * const message = dedent`
 *     Hello ${name},
 *       This line is indented
 *     Bye!
 * `;
 * console.log(message);
 * ```
 *
 * @param strings - Array of string literals from a template literal
 * @param values - Substituted values in the template literal
 * 
 * @returns a single string with consistent dedentation and trimmed edges
 */
function dedent(strings, ...values) {
    // Step 1: Reconstruct the full string from template parts
    let fullString = "";
    let i = 0;
    while (i < strings.length) {
        fullString += strings[i];
        if (i < values.length) {
            fullString += values[i];
        }
        i++;
    }

    // Step 2: Split into lines
    const lines = fullString.split("\n");

    // Step 3: Find minimum indentation
    let minIndent = Infinity;
    let j = 0;
    while (j < lines.length) {
        const line = lines[j];
        let k = 0;

        // Count leading spaces
        while (k < line.length && line[k] === ' ') {
            k++;
        }

        const isEmpty = line.trim().length === 0;
        if (!isEmpty && k < minIndent) {
            minIndent = k;
        }

        j++;
    }

    // Step 4: Dedent each line manually
    let result = "";
    let l = 0;
    while (l < lines.length) {
        const line = lines[l];
        let dedentedLine = "";

        let start = minIndent < line.length ? minIndent : line.length;
        let m = start;
        while (m < line.length) {
            dedentedLine += line[m];
            m++;
        }

        result += dedentedLine;

        // Append newline if not the last line
        if (l < lines.length - 1) {
            result += "\n";
        }

        l++;
    }

    // Step 5: Trim leading/trailing whitespace once at the end
    return result.trim();
}

  
main().catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
