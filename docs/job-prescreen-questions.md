# Job pre-screen test content (for Google Forms)

Reference question sets for the AutoProctor pre-screen flow: paste each job's
questions into a Google Form as that job's employer, submit the form link on
`/employer/jobs/new`, then approve/secure it as admin on
`/admin/pre-screen-approvals` before it goes live to applicants. See
`DEPLOYMENT.md` for the full workflow.

These are separate from the Learning Hub's in-app multiple-choice skill
tests (`backend/prisma/seed.prod.ts`) - pre-screen tests stay external and
per-job, one per posting below.

## Andela - Junior Frontend Developer (React)
1. What React hook manages local component state? → **A) useState**
   - A) useState B) useEffect C) useContext D) useRef
2. What does JSX compile down to? → **B) React.createElement calls**
   - A) HTML strings B) React.createElement calls C) CSS-in-JS D) WebAssembly
3. Which array method is used to render a list of items in React? → **C) .map()**
   - A) .forEach() B) .filter() C) .map() D) .reduce()
4. What is the purpose of a `key` prop in a list? → **A) Helps React identify which items changed**
   - A) Helps React identify which items changed B) Sets the element's CSS class C) Required for all HTML elements D) Improves image loading
5. What does `useEffect` with an empty dependency array (`[]`) do? → **B) Runs once after the initial render**
   - A) Runs on every render B) Runs once after the initial render C) Never runs D) Runs before the component mounts
6. Which CSS layout model is best suited for a responsive navbar? → **C) Flexbox**
   - A) Table layout B) Absolute positioning only C) Flexbox D) Float

## Andela - Backend Developer (Node.js / PostgreSQL)
1. What keyword declares an asynchronous function in JavaScript? → **B) async**
   - A) defer B) async C) promise D) wait
2. In PostgreSQL, which command creates a new table? → **A) CREATE TABLE**
   - A) CREATE TABLE B) NEW TABLE C) MAKE TABLE D) INSERT TABLE
3. What does REST stand for? → **B) Representational State Transfer**
   - A) Remote Execution Service Transfer B) Representational State Transfer C) Relational State Transfer D) Reactive State Transfer
4. Which HTTP method is idempotent and used to update an entire resource? → **C) PUT**
   - A) POST B) PATCH C) PUT D) GET
5. What is a primary key used for in a relational database? → **A) Uniquely identifying each row**
   - A) Uniquely identifying each row B) Sorting query results C) Encrypting data D) Naming the table
6. What does `npm install` read to determine which packages to install? → **B) package.json**
   - A) tsconfig.json B) package.json C) .env D) README.md

## Andela - QA / Test Engineer
1. What is the main difference between a unit test and an integration test? → **B) Unit tests isolate one function/module; integration tests check how parts work together**
   - A) Unit tests are slower B) Unit tests isolate one function/module; integration tests check how parts work together C) Integration tests don't need code D) There is no difference
2. What is a "regression bug"? → **A) A bug that reappears after previously being fixed**
   - A) A bug that reappears after previously being fixed B) A bug only found in production C) A bug caused by a database D) A cosmetic UI issue
3. What does "test coverage" measure? → **C) How much of the codebase is exercised by tests**
   - A) How fast tests run B) Number of testers on a team C) How much of the codebase is exercised by tests D) Number of bugs found
4. Which of these is an example of black-box testing? → **A) Testing based on requirements without seeing the code**
   - A) Testing based on requirements without seeing the code B) Reading the source code to design tests C) Debugging with breakpoints D) Reviewing a pull request
5. What should a good bug report always include? → **B) Steps to reproduce, expected vs. actual result**
   - A) Only a screenshot B) Steps to reproduce, expected vs. actual result C) The tester's opinion D) A fix suggestion only
6. What is the purpose of a smoke test? → **C) Quickly verify the most critical functionality works before deeper testing**
   - A) Test for fire-safety compliance B) Replace all other testing C) Quickly verify the most critical functionality works before deeper testing D) Only test UI colors

## Zipline - Drone Operations Technician
1. What is the primary purpose of a pre-flight checklist? → **A) Catch mechanical or safety issues before takeoff**
   - A) Catch mechanical or safety issues before takeoff B) Log flight hours only C) Satisfy a legal formality with no real purpose D) Calculate fuel cost
2. What should a technician do first if a drone reports a low-battery warning mid-mission? → **B) Follow the documented return-to-base / abort procedure**
   - A) Ignore it if the delivery is almost complete B) Follow the documented return-to-base / abort procedure C) Increase altitude D) Restart the drone mid-flight
3. Why is weather monitoring critical to drone logistics? → **C) High wind/rain can affect flight stability and safety**
   - A) It's not important once the drone is airborne B) Only relevant for scheduling, not safety C) High wind/rain can affect flight stability and safety D) Weather never affects drones
4. What is the purpose of routine maintenance logs? → **A) Track wear and catch issues before they cause failures**
   - A) Track wear and catch issues before they cause failures B) Required only for new drones C) Optional paperwork D) Used only for billing
5. If a delivered package's medical contents require temperature control, what matters most before dispatch? → **B) Verifying the payload was properly packed and within safe handling limits**
   - A) The color of the packaging B) Verifying the payload was properly packed and within safe handling limits C) The drone's paint condition D) The pilot's seniority
6. What's the safest response to an unexpected obstacle detected mid-flight? → **C) Follow the automated/manual avoidance procedure per protocol**
   - A) Continue on course regardless B) Immediately land wherever possible without checking surroundings C) Follow the automated/manual avoidance procedure per protocol D) Ignore it and file a report later

## Zipline - Supply Chain Coordinator
1. What is the main goal of inventory management? → **A) Balancing enough stock to meet demand without overstocking**
   - A) Balancing enough stock to meet demand without overstocking B) Always keeping maximum stock C) Never reordering D) Ignoring demand forecasts
2. What does "lead time" refer to in a supply chain? → **B) The time between placing an order and receiving it**
   - A) The time a truck spends idling B) The time between placing an order and receiving it C) Time spent on quality checks only D) The delivery driver's shift length
3. Why is demand forecasting important for logistics? → **C) It helps plan stock levels and delivery routes ahead of need**
   - A) It's mostly guesswork with no real value B) Only finance teams use it C) It helps plan stock levels and delivery routes ahead of need D) It replaces the need for inventory tracking
4. What is a key benefit of tracking delivery performance metrics (e.g. on-time rate)? → **A) Identifying bottlenecks and improving reliability**
   - A) Identifying bottlenecks and improving reliability B) It has no operational use C) Only useful for marketing D) Required only once a year
5. What should a coordinator do when a supplier reports a delay? → **B) Communicate proactively and adjust the delivery plan**
   - A) Say nothing until someone asks B) Communicate proactively and adjust the delivery plan C) Cancel all related orders immediately D) Wait for the delay to resolve itself
6. Why are standard operating procedures (SOPs) important in logistics? → **C) They ensure consistency and reduce errors across the team**
   - A) They slow the team down unnecessarily B) They're only for new employees C) They ensure consistency and reduce errors across the team D) They replace the need for training

## Zipline - Field Logistics Associate
1. What is the most important factor when confirming a delivery has arrived safely? → **A) Verifying the recipient and condition of the package**
   - A) Verifying the recipient and condition of the package B) Taking a photo of the drone C) Recording the weather D) None of the above
2. Why is accurate record-keeping important in field logistics? → **B) It ensures accountability and helps resolve delivery issues**
   - A) It's optional paperwork B) It ensures accountability and helps resolve delivery issues C) Only needed for expensive items D) It has no real use
3. What's the best approach when a delivery site is temporarily inaccessible? → **C) Follow the documented contingency/rerouting procedure**
   - A) Leave the package unattended nearby B) Cancel the delivery permanently C) Follow the documented contingency/rerouting procedure D) Wait indefinitely without notifying anyone
4. Why is clear communication with local health facility staff important? → **A) It ensures deliveries are expected, received, and logged correctly**
   - A) It ensures deliveries are expected, received, and logged correctly B) It's not necessary if the drone lands correctly C) Only management needs to communicate D) It slows down operations
5. What should be checked before dispatching a time-sensitive medical delivery? → **B) That the payload and delivery window meet requirements**
   - A) Nothing extra is needed B) That the payload and delivery window meet requirements C) The recipient's personal preferences only D) The color of the drone
6. What is a core responsibility of a field logistics associate? → **C) Coordinating ground support for safe, on-time deliveries**
   - A) Designing the drones B) Managing company finances C) Coordinating ground support for safe, on-time deliveries D) Marketing the service

## Ampersand - Battery Systems Technician
1. What is the primary safety concern when handling lithium-ion battery packs? → **A) Risk of thermal runaway/fire if damaged or improperly handled**
   - A) Risk of thermal runaway/fire if damaged or improperly handled B) They are completely inert and risk-free C) They only pose an electrical shock risk when fully depleted D) There is no special handling required
2. What does "battery swapping" refer to in an EV context? → **B) Replacing a depleted battery with a charged one instead of plugging in to charge**
   - A) Repairing a battery in place B) Replacing a depleted battery with a charged one instead of plugging in to charge C) Recycling old batteries only D) Upgrading a battery's firmware
3. Why is thermal management important in battery systems? → **C) Overheating reduces battery life and can create safety hazards**
   - A) It only affects charging speed, nothing else B) Batteries are unaffected by temperature C) Overheating reduces battery life and can create safety hazards D) It's only relevant in cold climates
4. What tool is commonly used to test a battery cell's voltage? → **A) A multimeter**
   - A) A multimeter B) A thermometer C) A barometer D) An oscilloscope only
5. What is a State of Charge (SoC) reading used for? → **B) Indicating how much energy remains in a battery**
   - A) Measuring the battery's physical weight B) Indicating how much energy remains in a battery C) Measuring ambient humidity D) Tracking the battery's manufacture date
6. Why should damaged battery cells be isolated immediately? → **C) To prevent short circuits or fire risk from spreading**
   - A) It's just standard paperwork procedure B) Damaged cells are not actually a risk C) To prevent short circuits or fire risk from spreading D) Only for inventory tracking purposes

## Ampersand - Electric Motorcycle Assembly Technician
1. What is torque specification used for during assembly? → **A) Ensuring bolts are tightened to the correct, safe level**
   - A) Ensuring bolts are tightened to the correct, safe level B) Measuring the motorcycle's top speed C) Testing tire pressure D) Calibrating the speedometer
2. Why is following a standardized assembly checklist important? → **B) It ensures consistency and reduces the risk of missed steps**
   - A) It's optional and rarely followed B) It ensures consistency and reduces the risk of missed steps C) It only matters for the final inspection D) It slows down the assembly line unnecessarily
3. What should be done before connecting any high-voltage component? → **C) Verify the system is powered off and follow lockout/safety procedure**
   - A) Nothing special is required B) Just visually inspect it C) Verify the system is powered off and follow lockout/safety procedure D) Only wear gloves
4. What is a quality control (QC) check used for in assembly? → **A) Catching defects before the product reaches the customer**
   - A) Catching defects before the product reaches the customer B) Slowing down production intentionally C) Replacing the need for training D) Only relevant to the finance team
5. Why is proper documentation of assembly steps important? → **B) It supports traceability and troubleshooting later**
   - A) It's just a formality with no real use B) It supports traceability and troubleshooting later C) Only required for exported units D) It replaces the need for testing
6. What is the purpose of a final function test after assembly? → **C) Confirming the motorcycle operates correctly before it ships**
   - A) To check the paint color B) To measure the technician's speed C) Confirming the motorcycle operates correctly before it ships D) It's not a required step

## Ampersand - Customer Support Associate (EV Fleet)
1. What is the best first step when a customer reports their e-motorcycle won't charge? → **A) Ask clarifying questions to understand the exact symptoms**
   - A) Ask clarifying questions to understand the exact symptoms B) Immediately schedule a battery replacement C) Tell them to buy a new charger D) Close the ticket without a response
2. Why is active listening important in customer support? → **B) It helps accurately understand and resolve the customer's issue**
   - A) It's not important, only speed matters B) It helps accurately understand and resolve the customer's issue C) It's only useful for angry customers D) It slows down ticket resolution
3. What should a support associate do with a safety-related complaint (e.g. overheating battery)? → **C) Escalate it immediately per safety protocol**
   - A) Handle it the same as any other ticket B) Ignore it if the customer seems calm C) Escalate it immediately per safety protocol D) Wait for a manager to notice
4. Why are clear, empathetic responses important in support tickets? → **A) They build trust and improve the customer's experience**
   - A) They build trust and improve the customer's experience B) They are not necessary if the issue is resolved C) Only useful for VIP customers D) They slow down response time unnecessarily
5. What is the purpose of a knowledge base for support teams? → **B) Providing consistent, accurate answers to common issues**
   - A) It's optional reading material B) Providing consistent, accurate answers to common issues C) Only for new hires D) It replaces the need for training
6. How should a support associate handle a battery swap station malfunction report? → **C) Log the issue accurately and route it to the technical team**
   - A) Tell the customer to fix it themselves B) Ignore it since it's not their department C) Log the issue accurately and route it to the technical team D) Close the ticket immediately

## Bank of Kigali - Junior Data Analyst
1. What does "data cleaning" primarily involve? → **A) Fixing or removing incorrect, incomplete, or duplicate data**
   - A) Fixing or removing incorrect, incomplete, or duplicate data B) Deleting all data older than a year C) Formatting spreadsheets for printing D) Encrypting data files
2. Which chart type is best for showing a trend over time? → **B) Line chart**
   - A) Pie chart B) Line chart C) Scatter plot only D) Table
3. What does "average" (mean) measure in a dataset? → **C) The central tendency, calculated by summing values and dividing by count**
   - A) The most frequently occurring value B) The middle value when sorted C) The central tendency, calculated by summing values and dividing by count D) The range between highest and lowest values
4. In a spreadsheet, what does a VLOOKUP-style function do? → **A) Finds a value in one column and returns a related value from another**
   - A) Finds a value in one column and returns a related value from another B) Sorts a column alphabetically C) Deletes duplicate rows D) Formats currency values
5. Why is data visualization useful in analysis? → **B) It makes patterns and trends easier to understand quickly**
   - A) It replaces the need for accurate data B) It makes patterns and trends easier to understand quickly C) It's only for presentations, not analysis D) It has no real analytical value
6. What is a KPI (Key Performance Indicator)? → **C) A measurable value showing how effectively a goal is being achieved**
   - A) A type of database B) A software tool only C) A measurable value showing how effectively a goal is being achieved D) A synonym for "budget"

## Bank of Kigali - Customer Service Representative
1. What is the best way to handle an upset customer? → **B) Listen calmly, acknowledge the issue, and work toward a solution**
   - A) Argue back to defend the bank B) Listen calmly, acknowledge the issue, and work toward a solution C) Transfer them immediately without explanation D) Ignore the complaint
2. Why is confidentiality important when handling customer account information? → **A) Protecting customer privacy and complying with banking regulations**
   - A) Protecting customer privacy and complying with banking regulations B) It's only a suggestion, not a requirement C) It only matters for large accounts D) It has no real impact on trust
3. What should a representative do if unsure how to resolve a customer's request? → **C) Escalate to a supervisor or the correct department**
   - A) Guess an answer to seem confident B) Tell the customer to figure it out themselves C) Escalate to a supervisor or the correct department D) Ignore the request
4. Why is accuracy important when processing customer transactions? → **B) Errors can cause financial harm and loss of customer trust**
   - A) Accuracy doesn't really matter if it's fixed later B) Errors can cause financial harm and loss of customer trust C) Only large transactions need to be accurate D) It's only an IT department concern
5. What is a key part of good phone etiquette in customer service? → **A) Speaking clearly, politely, and staying professional**
   - A) Speaking clearly, politely, and staying professional B) Ending calls as quickly as possible regardless of resolution C) Multitasking loudly during the call D) Using technical jargon at all times
6. Why might a bank ask for identity verification before discussing an account? → **C) To prevent fraud and protect the account holder**
   - A) It's an unnecessary formality B) Only for large withdrawals C) To prevent fraud and protect the account holder D) It's required only for new customers

## Bank of Kigali - IT Support Officer
1. What is the first step when a user reports "my computer won't turn on"? → **A) Ask clarifying questions and check the basics (power, cables, indicators)**
   - A) Ask clarifying questions and check the basics (power, cables, indicators) B) Immediately replace the computer C) Reinstall the operating system D) Escalate without troubleshooting
2. Why is regularly updating software important for security? → **B) Updates often patch known security vulnerabilities**
   - A) Updates only add new features, nothing else B) Updates often patch known security vulnerabilities C) It's not important if a firewall exists D) Only antivirus software needs updates
3. What is phishing? → **C) A fraudulent attempt to trick someone into revealing sensitive information**
   - A) A method of testing network speed B) A type of computer virus that damages hardware C) A fraudulent attempt to trick someone into revealing sensitive information D) A backup strategy
4. Why should IT staff document resolved support tickets? → **A) It builds a knowledge base and helps track recurring issues**
   - A) It builds a knowledge base and helps track recurring issues B) It's just paperwork with no real benefit C) Only required for hardware issues D) It replaces the need for a helpdesk system
5. What is the purpose of a password policy (e.g. minimum length, complexity)? → **B) Reducing the risk of accounts being compromised**
   - A) Making it harder for employees to log in for no reason B) Reducing the risk of accounts being compromised C) It's a legal formality with no security benefit D) Only applies to admin accounts
6. What should be done before granting a new employee access to banking systems? → **C) Verify their identity and assign the correct access level per policy**
   - A) Give them full access immediately for convenience B) Skip verification if they're in a hurry C) Verify their identity and assign the correct access level per policy D) Wait a year before granting any access
