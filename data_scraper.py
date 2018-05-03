from os import makedirs, rename, remove
from os.path import join, exists
from collections import defaultdict
from re import match

# 3rd party
import requests
from bs4 import BeautifulSoup
from tinydb import TinyDB

SCHEDULE = 'schedule.html'
TERM_CODES = {'fh': '201841', 'da': '201842'}
HEADERS = ('course', 'CRN', 'desc', 'status', 'days', 'time', 'start', 'end',
           'room', 'campus', 'units', 'instructor', 'seats', 'wait_seats', 'wait_cap')
DB_ROOT = 'db/'

COURSE_PATTERN = '[FD]0*(\d*\w?)\.?\d*([YWH])?'

def main():
    if not exists(DB_ROOT):
        makedirs(DB_ROOT, exist_ok=True)

    for term in TERM_CODES.keys():
        temp_path = join(DB_ROOT, 'temp.json')
        temp = TinyDB(temp_path)

        content = mine(TERM_CODES[term])
        parse(content, db=temp)

        rename(temp_path, join(DB_ROOT, f'{term}_database.json')) and remove(temp_path)

    fh_db = TinyDB(join(DB_ROOT, 'fh_database.json'))
    da_db = TinyDB(join(DB_ROOT, 'da_database.json'))
    print('Foothill', fh_db.tables())
    print('De Anza', da_db.tables())


def mine(term, write=False):
    '''
    Mine will hit the database for foothill's class listings and write it to a file.
    :param term: (str) the term to mine
    :param write: (bool) write to file?
    :return res.content: (json) the html body
    '''
    headers = {
        'Origin': 'https://banssb.fhda.edu',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'FoothillAPI',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html, */*; q=0.01',
        'Referer': 'https://banssb.fhda.edu/PROD/fhda_opencourses.P_Application',
        'X-Requested-With': 'XMLHttpRequest',
        'Connection': 'keep-alive',
    }

    data = [('termcode', f'{term}'), ]

    res = requests.post('https://banssb.fhda.edu/PROD/fhda_opencourses.P_GetCourseList', headers=headers, data=data)
    res.raise_for_status()

    if write:
        with open(f'{SCHEDULE}', "wb") as file:
            for chunk in res.iter_content(chunk_size=512):
                if chunk:
                    file.write(chunk)

    return res.content


def parse(content, db):
    '''
    Parse takes the content from the request and then populates the database with the data
    :param content: (html) The html containing the courses
    :param db: (TinyDB) the current database
    '''
    soup = BeautifulSoup(content, 'html5lib')

    tables = soup.find_all('table', {'class': 'TblCourses'})
    for t in tables:
        dept = t['dept'].replace(' ', '')
        dept_desc = t['dept-desc']

        rows = t.find_all('tr', {'class': 'CourseRow'})
        s = defaultdict(lambda: defaultdict(list))  # key: list()
        for r in rows:
            cols = r.find_all(lambda tag: tag.name == 'td' and not tag.get_text().isspace())

            if cols:
                for i, c in enumerate(cols):
                    a = c.find('a')
                    cols[i] = a.get_text() if a else cols[i].get_text()

                try:
                    key = get_key(f'{cols[0] if cols[0] else cols[1]}')[0]
                    data = dict(zip(HEADERS, cols))
                    crn = data['CRN']

                    if len(s[key][crn]) > 0:
                        comb = set(s[key][crn][0].items()) ^ set(data.items())
                        if len(comb) == 0:
                            continue
                    s[key][crn].append(data)
                except KeyError:
                    continue

        j = dict(s)
        db.table(f'{dept}').insert(j)


def get_key(course):
    '''
    This is the key parser for the course names
    :param course: (str) The unparsed string containing the course name
    :return match_obj.groups(): (list) the string for the regex match
    '''
    c = course.split(' ')
    idx = 1 if len(c) < 3 else 2
    section = c[idx]

    match_obj = match(COURSE_PATTERN, section)
    return match_obj.groups()


if __name__ == "__main__":
    main()
