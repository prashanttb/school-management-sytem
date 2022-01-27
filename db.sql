-- session table
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
GRANT ALL PRIVILEGES ON TABLE "session" TO ppp;

-- student table 
CREATE TABLE "student" (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password VARCHAR(200) NOT NULL,
    UNIQUE (email)
);

-- teacher table
CREATE TABLE "teacher" (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    courseid INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password VARCHAR(200) NOT NULL,
    UNIQUE (email)
);

-- course table
CREATE TABLE "course" (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(200) NOT NULL,
);

-- class table
CREATE TABLE "class" (
    id BIGSERIAL PRIMARY KEY NOT NULL,
    courseid INTEGER NOT NULL,
    teacherid INTEGER NOT NULL,
    studentid INTEGER NOT NULL
);